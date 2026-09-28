import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.aafiya.aafiya_patient"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.aafiya.aafiya_patient"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    val keystorePropertiesFile = rootProject.file("key.properties")
    val keystoreProperties = Properties()
    val hasKeyProperties = keystorePropertiesFile.exists()
    if (hasKeyProperties) {
        FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
    }

    val storeFilePath = keystoreProperties.getProperty("storeFile")
    val keyAliasProp = keystoreProperties.getProperty("keyAlias")
    val storePasswordProp = keystoreProperties.getProperty("storePassword")
    val keyPasswordProp = keystoreProperties.getProperty("keyPassword")

    val hasAllProperties = !storeFilePath.isNullOrBlank() &&
        !keyAliasProp.isNullOrBlank() &&
        !storePasswordProp.isNullOrBlank() &&
        !keyPasswordProp.isNullOrBlank()

    val keystoreFile = if (!storeFilePath.isNullOrBlank()) file(storeFilePath) else null
    val hasValidKeystore = keystoreFile?.exists() == true

    val hasProductionSigning = hasKeyProperties && hasAllProperties && hasValidKeystore

    signingConfigs {
        if (hasProductionSigning) {
            create("release") {
                keyAlias = keyAliasProp
                keyPassword = keyPasswordProp
                storeFile = keystoreFile
                storePassword = storePasswordProp
            }
        }
    }

    buildTypes {
        release {
            if (hasProductionSigning) {
                signingConfig = signingConfigs.getByName("release")
            } else {
                // Fail-closed: Never assign debug signing to release builds.
                signingConfig = null
            }
        }
    }
}

gradle.taskGraph.whenReady {
    val keystorePropertiesFile = rootProject.file("key.properties")
    val keystoreProperties = Properties()
    val hasKeyProperties = keystorePropertiesFile.exists()
    if (hasKeyProperties) {
        FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
    }

    val storeFilePath = keystoreProperties.getProperty("storeFile")
    val keyAliasProp = keystoreProperties.getProperty("keyAlias")
    val storePasswordProp = keystoreProperties.getProperty("storePassword")
    val keyPasswordProp = keystoreProperties.getProperty("keyPassword")

    val hasAllProperties = !storeFilePath.isNullOrBlank() &&
        !keyAliasProp.isNullOrBlank() &&
        !storePasswordProp.isNullOrBlank() &&
        !keyPasswordProp.isNullOrBlank()

    val keystoreFile = if (!storeFilePath.isNullOrBlank()) file(storeFilePath) else null
    val hasValidKeystore = keystoreFile?.exists() == true
    val hasProductionSigning = hasKeyProperties && hasAllProperties && hasValidKeystore

    val isReleaseExecution = allTasks.any { task ->
        val name = task.name.lowercase()
        (name.contains("release") || name.contains("bundle")) && !name.contains("debug")
    }

    if (isReleaseExecution && !hasProductionSigning) {
        val failureReason = when {
            !hasKeyProperties -> "key.properties file is missing at ${keystorePropertiesFile.absolutePath}"
            !hasAllProperties -> "One or more required signing properties (storeFile, keyAlias, storePassword, keyPassword) are missing in key.properties"
            !hasValidKeystore -> "The keystore file referenced in key.properties ($storeFilePath) does not exist"
            else -> "Production signing configuration could not be validated"
        }
        throw GradleException(
            """
            |================================================================================
            |AAFIYA RELEASE BUILD BLOCKED:
            |Production signing configuration is missing or invalid.
            |Debug signing fallback is strictly prohibited.
            |Reason: $failureReason
            |Configure a valid production signing key before generating a release artifact.
            |================================================================================
            """.trimMargin()
        )
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
