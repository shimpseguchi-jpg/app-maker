package com.shimpseguchi.photodrive

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

/** 送信先（Google アカウントと保存先フォルダ）の設定と、送信待ちの管理。 */
class SettingsActivity : AppCompatActivity() {

    private lateinit var account: TextView
    private lateinit var folder: EditText
    private lateinit var testResult: TextView
    private lateinit var pending: TextView

    /** アカウント選択・許可の画面から戻ってきたとき */
    private val consent = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { res ->
        runCatching { DriveAuth.client(this).getAuthorizationResultFromIntent(res.data) }
            .onSuccess { onAuthorized(it) }
            .onFailure { showSignInError(it) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.root)) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.navigationBars() or WindowInsetsCompat.Type.ime())
            v.updatePadding(bottom = bars.bottom)
            insets
        }

        account = findViewById(R.id.account)
        folder = findViewById(R.id.folder)
        testResult = findViewById(R.id.testResult)
        pending = findViewById(R.id.pending)

        folder.setText(AppSettings.folderId(this))
        AppSettings.folderName(this).takeIf { it.isNotBlank() }?.let {
            testResult.text = getString(R.string.settings_test_ok, it)
        }

        findViewById<Button>(R.id.signIn).setOnClickListener { signIn() }
        findViewById<Button>(R.id.signOut).setOnClickListener {
            AppSettings.signOut(this)
            showAccount()
        }
        findViewById<Button>(R.id.test).setOnClickListener { test() }
        findViewById<Button>(R.id.deletePending).setOnClickListener { confirmDelete() }
    }

    override fun onResume() {
        super.onResume()
        showAccount()
        refreshPending()
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    private fun showAccount() {
        val email = AppSettings.account(this)
        account.text = when {
            email.isBlank() -> getString(R.string.settings_no_account)
            AppSettings.needsLogin(this) -> getString(R.string.settings_account_needs_login, email)
            else -> email
        }
    }

    // ---- ログイン ----

    private fun signIn() {
        // ログアウト後や初回はアカウントを選ばせる。許可が切れたときは同じアカウントで聞き直す
        val current = AppSettings.account(this).takeIf { AppSettings.needsLogin(this) }
        lifecycleScope.launch {
            runCatching { DriveAuth.client(this@SettingsActivity).authorize(DriveAuth.request(current)).await() }
                .onSuccess { result ->
                    val intent = result.pendingIntent
                    if (result.hasResolution() && intent != null) {
                        consent.launch(IntentSenderRequest.Builder(intent.intentSender).build())
                    } else {
                        onAuthorized(result)
                    }
                }
                .onFailure { showSignInError(it) }
        }
    }

    private fun onAuthorized(result: AuthorizationResult) {
        val email = DriveAuth.accountOf(result)
        if (email == null) {
            showSignInError(IllegalStateException("アカウントがわかりません"))
            return
        }
        AppSettings.saveAccount(this, email)
        showAccount()
        UploadWorker.enqueue(this)
    }

    private fun showSignInError(e: Throwable) {
        testResult.text = getString(R.string.settings_sign_in_failed, e.message ?: e.javaClass.simpleName)
    }

    // ---- フォルダ ----

    private fun test() {
        val email = AppSettings.account(this)
        if (email.isBlank()) {
            testResult.setText(R.string.settings_need_account)
            return
        }
        val id = AppSettings.parseFolderId(folder.text.toString())
        if (id.isBlank()) return
        folder.setText(id)
        testResult.setText(R.string.settings_testing)
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val token = DriveAuth.tokenOrNull(this@SettingsActivity, email)
                        ?: throw IllegalStateException(getString(R.string.status_needs_login))
                    try {
                        DriveUploader.folderName(token, id)
                    } catch (e: DriveUploader.AuthException) {
                        DriveAuth.clearToken(this@SettingsActivity, token)
                        DriveUploader.folderName(DriveAuth.tokenOrNull(this@SettingsActivity, email) ?: throw e, id)
                    }
                }
            }
            result
                .onSuccess { name ->
                    AppSettings.saveFolder(this@SettingsActivity, id, name)
                    testResult.text = getString(R.string.settings_test_ok, name)
                    UploadWorker.enqueue(this@SettingsActivity)
                }
                .onFailure { testResult.text = getString(R.string.settings_test_ng, it.message ?: it.javaClass.simpleName) }
        }
    }

    // ---- 送信待ち ----

    private fun refreshPending() {
        lifecycleScope.launch {
            val n = withContext(Dispatchers.IO) { PhotoQueue.count(this@SettingsActivity) }
            pending.text = getString(R.string.settings_pending_count, n)
        }
    }

    private fun confirmDelete() {
        MaterialAlertDialogBuilder(this)
            .setMessage(R.string.settings_delete_confirm)
            .setPositiveButton(R.string.settings_delete_yes) { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { PhotoQueue.clear(this@SettingsActivity) }
                    refreshPending()
                }
            }
            .setNegativeButton(R.string.settings_cancel, null)
            .show()
    }
}
