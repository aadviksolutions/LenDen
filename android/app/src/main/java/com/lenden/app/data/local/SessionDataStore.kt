package com.lenden.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "lenden_session")

class SessionDataStore(private val context: Context) {

    companion object {
        val KEY_SESSION_TOKEN = stringPreferencesKey("session_token")
        val KEY_USER_ID = stringPreferencesKey("user_id")
        val KEY_USER_NAME = stringPreferencesKey("user_name")
        val KEY_USER_EMAIL = stringPreferencesKey("user_email")
        val KEY_BUSINESS_ID = stringPreferencesKey("business_id")
        val KEY_BUSINESS_NAME = stringPreferencesKey("business_name")
        val KEY_BUSINESS_GSTIN = stringPreferencesKey("business_gstin")
    }

    val sessionToken: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[KEY_SESSION_TOKEN]
    }

    val businessName: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[KEY_BUSINESS_NAME]
    }

    val businessGstin: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[KEY_BUSINESS_GSTIN]
    }

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { preferences ->
        !preferences[KEY_SESSION_TOKEN].isNullOrBlank()
    }

    suspend fun saveSession(
        token: String,
        userId: String,
        userName: String,
        userEmail: String,
        businessId: String? = null,
        businessName: String? = null,
        businessGstin: String? = null
    ) {
        context.dataStore.edit { preferences ->
            preferences[KEY_SESSION_TOKEN] = token
            preferences[KEY_USER_ID] = userId
            preferences[KEY_USER_NAME] = userName
            preferences[KEY_USER_EMAIL] = userEmail
            businessId?.let { preferences[KEY_BUSINESS_ID] = it }
            businessName?.let { preferences[KEY_BUSINESS_NAME] = it }
            businessGstin?.let { preferences[KEY_BUSINESS_GSTIN] = it }
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
