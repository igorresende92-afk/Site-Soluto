<?php

error_reporting(0);
ini_set('display_errors', 0);

// Basic Autoloader
spl_autoload_register(function ($class) {
    if (strpos($class, 'FinFlow\\') === 0) {
        $path = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, 8)) . '.php';
        if (file_exists($path)) {
            require_once $path;
        }
    }
});

// Load Config constants (but functions are deprecated/moved)
// We still need DB constants.
// Let's modify api/config.php to be cleaner or just load env vars here.
// For now, let's include api/config.php but we will phase it out.
// Actually, let's just use this bootstrap in the new endpoints.

// If we want to replace api/config.php usage, we need to ensure everything it did is covered.
// 1. Constants (DB_HOST etc) -> Database.php handles getenv, but constants are nice.
// 2. getDB() -> Database::getConnection()
// 3. CORS -> Response class or Middleware? Let's add CORS helper in Utils.
// 4. JWT -> AuthUtils?
// 5. Helpers (jsonInput, etc) -> Utils.

require_once __DIR__ . '/config.php'; // Keep for now for backward compatibility of constants/helpers not yet moved.
