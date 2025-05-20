## mobile/ – additional agent guidance
* **Android**: Kotlin + Jetpack Compose; minSdk = 26; targetSdk = 34.  
* **iOS**: Swift 5.9 + SwiftUI; minimum iOS 17.  
* **Bridge requirements**: use JNI for Android, Swift-Package-Manager for iOS.  
* **Testing**: all business logic in shared Kotlin/Swift modules must reach 90 % coverage (use Kover / Xcode Tests).  
* **UX rule**: never block the UI thread; long tasks in coroutines / `async` tasks.  
* **Security**: store keys in Android Keystore / iOS Secure Enclave; no plaintext keys on disk.
