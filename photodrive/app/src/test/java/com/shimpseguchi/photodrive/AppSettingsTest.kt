package com.shimpseguchi.photodrive

import org.junit.Assert.assertEquals
import org.junit.Test

class AppSettingsTest {
    @Test
    fun parsesFolderUrlOrId() {
        assertEquals("1AbC-d_9", AppSettings.parseFolderId("https://drive.google.com/drive/folders/1AbC-d_9?usp=sharing"))
        assertEquals("1AbC-d_9", AppSettings.parseFolderId("https://drive.google.com/drive/u/0/folders/1AbC-d_9"))
        assertEquals("1AbC-d_9", AppSettings.parseFolderId("https://drive.google.com/open?id=1AbC-d_9"))
        assertEquals("1AbC-d_9", AppSettings.parseFolderId("  1AbC-d_9 "))
    }
}
