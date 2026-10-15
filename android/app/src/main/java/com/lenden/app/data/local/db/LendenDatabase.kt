package com.lenden.app.data.local.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.lenden.app.data.local.db.dao.*
import com.lenden.app.data.local.db.entity.*

@Database(
    entities = [
        InvoiceDraftEntity::class,
        CachedCustomerEntity::class,
        CachedProductEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class LendenDatabase : RoomDatabase() {
    abstract fun invoiceDraftDao(): InvoiceDraftDao
    abstract fun customerDao(): CustomerDao
    abstract fun productDao(): ProductDao

    companion object {
        @Volatile
        private var INSTANCE: LendenDatabase? = null

        fun getInstance(context: Context): LendenDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    LendenDatabase::class.java,
                    "lenden_local.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
