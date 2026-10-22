package com.shimpseguchi.photodrive

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.lifecycle.lifecycleScope
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** 送信先（GAS ウェブアプリの URL と合言葉）の設定と、送信待ちの管理。 */
class SettingsActivity : AppCompatActivity() {

    private lateinit var url: EditText
    private lateinit var token: EditText
    private lateinit var testResult: TextView
    private lateinit var pending: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.root)) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.navigationBars() or WindowInsetsCompat.Type.ime())
            v.updatePadding(bottom = bars.bottom)
            insets
        }

        url = findViewById(R.id.url)
        token = findViewById(R.id.token)
        testResult = findViewById(R.id.testResult)
        pending = findViewById(R.id.pending)

        url.setText(AppSettings.rawUrl(this))
        token.setText(AppSettings.rawToken(this))

        findViewById<Button>(R.id.save).setOnClickListener {
            save()
            Toast.makeText(this, R.string.settings_saved, Toast.LENGTH_SHORT).show()
        }
        findViewById<Button>(R.id.test).setOnClickListener { test() }
        findViewById<Button>(R.id.deletePending).setOnClickListener { confirmDelete() }
    }

    override fun onResume() {
        super.onResume()
        refreshPending()
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    private fun save() {
        AppSettings.save(this, url.text.toString(), token.text.toString())
        UploadWorker.enqueue(this)
    }

    private fun test() {
        save()
        val settings = AppSettings.load(this) ?: run {
            testResult.text = getString(R.string.settings_test_ng, getString(R.string.status_not_configured))
            return
        }
        testResult.setText(R.string.settings_testing)
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) { runCatching { DriveUploader.ping(settings) } }
            testResult.text = result.fold(
                { getString(R.string.settings_test_ok, it) },
                { getString(R.string.settings_test_ng, it.message ?: it.javaClass.simpleName) }
            )
        }
    }

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
