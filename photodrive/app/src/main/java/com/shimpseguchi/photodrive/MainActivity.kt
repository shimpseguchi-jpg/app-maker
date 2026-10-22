package com.shimpseguchi.photodrive

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Matrix
import android.media.MediaActionSound
import android.net.ConnectivityManager
import android.os.Bundle
import android.os.SystemClock
import android.util.Size
import android.view.KeyEvent
import android.view.OrientationEventListener
import android.view.Surface
import android.view.View
import android.view.WindowManager
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.FallbackStrategy
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.google.android.material.button.MaterialButtonToggleGroup
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * 起動するとすぐ撮影画面。撮った写真・動画はギャラリーには入れず、
 * 暗号化して送信待ちにし、Wi-Fi のときに Google Drive へ送る（送ったら消える）。
 */
class MainActivity : AppCompatActivity() {

    private lateinit var previewView: PreviewView
    private lateinit var shutter: ImageButton
    private lateinit var status: TextView
    private lateinit var timer: TextView
    private lateinit var flash: View
    private lateinit var modeGroup: MaterialButtonToggleGroup
    private lateinit var permissionBox: View

    private val ioExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val sound = MediaActionSound()

    private var cameraProvider: ProcessCameraProvider? = null
    private var imageCapture: ImageCapture? = null
    private var videoCapture: VideoCapture<Recorder>? = null
    private var recording: Recording? = null
    private var recordingStart = 0L
    private var videoMode = false
    private var uploading = false
    private var rotation = Surface.ROTATION_0

    private val requestPermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { onPermissionsChanged() }

    private val orientationListener by lazy {
        object : OrientationEventListener(this) {
            override fun onOrientationChanged(degrees: Int) {
                if (degrees == ORIENTATION_UNKNOWN) return
                rotation = when (degrees) {
                    in 45 until 135 -> Surface.ROTATION_270
                    in 135 until 225 -> Surface.ROTATION_180
                    in 225 until 315 -> Surface.ROTATION_90
                    else -> Surface.ROTATION_0
                }
                imageCapture?.targetRotation = rotation
                if (recording == null) videoCapture?.targetRotation = rotation
            }
        }
    }

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: android.net.Network) = postStatus()
        override fun onLost(network: android.net.Network) = postStatus()
        override fun onCapabilitiesChanged(network: android.net.Network, caps: android.net.NetworkCapabilities) = postStatus()
    }

    private val timerTick = object : Runnable {
        override fun run() {
            if (recording == null) return
            val sec = (SystemClock.elapsedRealtime() - recordingStart) / 1000
            timer.text = "● %02d:%02d".format(sec / 60, sec % 60)
            timer.postDelayed(this, 500)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 最近使ったアプリの一覧にプレビューの絵が残らないように＆画面の記録を防ぐ
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContentView(R.layout.activity_main)

        previewView = findViewById(R.id.preview)
        shutter = findViewById(R.id.shutter)
        status = findViewById(R.id.status)
        timer = findViewById(R.id.timer)
        flash = findViewById(R.id.flash)
        modeGroup = findViewById(R.id.modeGroup)
        permissionBox = findViewById(R.id.permissionBox)

        val overlay = findViewById<View>(R.id.overlay)
        ViewCompat.setOnApplyWindowInsetsListener(overlay) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }

        shutter.setOnClickListener { onShutter() }
        findViewById<View>(R.id.settingsButton).setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
        findViewById<View>(R.id.permissionButton).setOnClickListener { askPermissions() }
        modeGroup.addOnButtonCheckedListener { _, id, checked ->
            if (checked) setMode(id == R.id.modeVideo)
        }

        sound.load(MediaActionSound.SHUTTER_CLICK)

        // 前回の録画の残りがあれば暗号化して送信待ちへ
        background {
            PhotoQueue.rescueRecordings(this)
            UploadWorker.enqueue(this)
            postStatus()
        }

        WorkManager.getInstance(this).getWorkInfosForUniqueWorkLiveData(UploadWorker.WORK_NAME)
            .observe(this) { infos ->
                uploading = infos.any { it.state == WorkInfo.State.RUNNING }
                postStatus()
            }

        if (hasCameraPermission()) startCamera() else askPermissions()
    }

    override fun onStart() {
        super.onStart()
        orientationListener.enable()
        getSystemService(ConnectivityManager::class.java)?.registerDefaultNetworkCallback(networkCallback)
        postStatus()
    }

    override fun onStop() {
        super.onStop()
        orientationListener.disable()
        runCatching { getSystemService(ConnectivityManager::class.java)?.unregisterNetworkCallback(networkCallback) }
        // 画面を離れたら録画は止めて保存する
        recording?.stop()
    }

    override fun onDestroy() {
        super.onDestroy()
        sound.release()
        ioExecutor.shutdown()
    }

    /** 音量キー・カメラキーでもシャッターを切れるようにする */
    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN || keyCode == KeyEvent.KEYCODE_VOLUME_UP ||
            keyCode == KeyEvent.KEYCODE_CAMERA
        ) {
            if (event.repeatCount == 0 && cameraProvider != null) onShutter()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    // ---- 権限 ----

    private fun hasCameraPermission() =
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

    private fun hasAudioPermission() =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

    private fun askPermissions() =
        requestPermissions.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO))

    private fun onPermissionsChanged() {
        if (hasCameraPermission()) startCamera() else permissionBox.isVisible = true
    }

    // ---- カメラ ----

    private fun startCamera() {
        permissionBox.isVisible = false
        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({
            cameraProvider = future.get()
            bindUseCases()
        }, ContextCompat.getMainExecutor(this))
    }

    /** 写真モードと動画モードで使うものを付け替える（どの機種でも動くように同時には使わない）。 */
    private fun bindUseCases() {
        val provider = cameraProvider ?: return
        val preview = Preview.Builder()
            .setResolutionSelector(
                ResolutionSelector.Builder()
                    .setAspectRatioStrategy(
                        if (videoMode) AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY
                        else AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY
                    )
                    .build()
            )
            .build()
            .also { it.surfaceProvider = previewView.surfaceProvider }

        provider.unbindAll()
        imageCapture = null
        videoCapture = null
        try {
            if (videoMode) {
                val recorder = Recorder.Builder()
                    .setQualitySelector(
                        QualitySelector.from(Quality.FHD, FallbackStrategy.lowerQualityOrHigherThan(Quality.HD))
                    )
                    .build()
                val vc = VideoCapture.withOutput(recorder).also { it.targetRotation = rotation }
                provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, vc)
                videoCapture = vc
            } else {
                val ic = ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                    .setResolutionSelector(
                        ResolutionSelector.Builder()
                            .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
                            .setResolutionStrategy(
                                ResolutionStrategy(
                                    PHOTO_SIZE,
                                    ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER
                                )
                            )
                            .build()
                    )
                    .setTargetRotation(rotation)
                    .build()
                provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, ic)
                imageCapture = ic
            }
        } catch (e: Exception) {
            Toast.makeText(this, e.message ?: getString(R.string.toast_capture_failed), Toast.LENGTH_LONG).show()
        }
    }

    private fun setMode(video: Boolean) {
        if (video == videoMode || recording != null) return
        videoMode = video
        shutter.setBackgroundResource(if (video) R.drawable.bg_shutter_video else R.drawable.bg_shutter)
        if (cameraProvider != null) bindUseCases()
    }

    private fun onShutter() {
        if (videoMode) toggleRecording() else takePhoto()
    }

    // ---- 写真 ----

    private fun takePhoto() {
        val ic = imageCapture ?: return
        sound.play(MediaActionSound.SHUTTER_CLICK)
        flash.alpha = 0.8f
        flash.animate().alpha(0f).setDuration(200).start()
        // ファイルには書かず、メモリ上で受け取る
        ic.takePicture(ioExecutor, object : ImageCapture.OnImageCapturedCallback() {
            override fun onCaptureSuccess(image: ImageProxy) {
                try {
                    val jpeg = image.use { toUprightJpeg(it) }
                    PhotoQueue.addBytes(this@MainActivity, PhotoQueue.newName("jpg"), jpeg)
                    UploadWorker.enqueue(this@MainActivity)
                    postStatus()
                } catch (e: Exception) {
                    toast(R.string.toast_capture_failed)
                }
            }

            override fun onError(exception: ImageCaptureException) = toast(R.string.toast_capture_failed)
        })
    }

    /** 向きを正しく直した JPEG を作る。作り直すので位置情報などのメタデータは残らない。 */
    private fun toUprightJpeg(image: ImageProxy): ByteArray {
        val src = image.toBitmap()
        val degrees = image.imageInfo.rotationDegrees
        val bmp = if (degrees != 0) {
            Bitmap.createBitmap(src, 0, 0, src.width, src.height, Matrix().apply { postRotate(degrees.toFloat()) }, true)
                .also { src.recycle() }
        } else src
        val out = ByteArrayOutputStream(4 shl 20)
        bmp.compress(Bitmap.CompressFormat.JPEG, 92, out)
        bmp.recycle()
        return out.toByteArray()
    }

    // ---- 動画 ----

    @SuppressLint("MissingPermission")
    private fun toggleRecording() {
        recording?.let {
            it.stop()
            return
        }
        val vc = videoCapture ?: return
        val name = PhotoQueue.newName("mp4")
        // 録画中だけアプリ専用領域に置き、終わったらすぐ暗号化して元は消す
        val file = File(PhotoQueue.recordingDir(this), name)
        val pending = vc.output.prepareRecording(this, FileOutputOptions.Builder(file).build())
        if (hasAudioPermission()) pending.withAudioEnabled() else toast(R.string.toast_no_audio)

        recording = pending.start(ContextCompat.getMainExecutor(this)) { event ->
            when (event) {
                is VideoRecordEvent.Start -> {
                    sound.play(MediaActionSound.START_VIDEO_RECORDING)
                    recordingStart = SystemClock.elapsedRealtime()
                    shutter.setBackgroundResource(R.drawable.bg_shutter_recording)
                    modeGroup.isEnabled = false
                    timer.isVisible = true
                    timer.post(timerTick)
                }
                is VideoRecordEvent.Finalize -> {
                    sound.play(MediaActionSound.STOP_VIDEO_RECORDING)
                    recording = null
                    shutter.setBackgroundResource(R.drawable.bg_shutter_video)
                    modeGroup.isEnabled = true
                    timer.isVisible = false
                    // 容量不足・画面を離れたなどで止まった場合も、書けたところまでは残す
                    background {
                        if (file.length() > 0) {
                            runCatching { PhotoQueue.addFile(this, name, file) }
                                .onSuccess { toast(R.string.toast_saved_video) }
                                .onFailure { toast(R.string.toast_capture_failed) }
                            UploadWorker.enqueue(this)
                        } else {
                            file.delete()
                            toast(R.string.toast_capture_failed)
                        }
                        postStatus()
                    }
                }
            }
        }
    }

    // ---- 表示 ----

    private fun postStatus() {
        background {
            val count = PhotoQueue.count(this)
            val configured = AppSettings.load(this) != null
            val wifi = Network.isWifi(this)
            runOnUiThread { showStatus(count, configured, wifi) }
        }
    }

    private fun showStatus(count: Int, configured: Boolean, wifi: Boolean) {
        val parts = mutableListOf(
            if (count == 0) getString(R.string.status_none) else getString(R.string.status_pending, count)
        )
        parts += when {
            !configured -> getString(R.string.status_not_configured)
            count > 0 && uploading && wifi -> getString(R.string.status_uploading)
            wifi -> getString(R.string.status_wifi)
            else -> getString(R.string.status_wait_wifi)
        }
        status.text = parts.joinToString(" ・ ")
    }

    private fun background(task: () -> Unit) {
        // 画面を閉じた後に呼ばれたら何もしない（録画の残りは次回起動時に拾う）
        runCatching { ioExecutor.execute(task) }
    }

    private fun toast(res: Int) = runOnUiThread { Toast.makeText(this, res, Toast.LENGTH_SHORT).show() }

    companion object {
        /** 写真の大きさの目安（約800万画素）。 */
        private val PHOTO_SIZE = Size(3264, 2448)
    }
}
