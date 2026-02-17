<?php

namespace FinFlow\Config;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $pdo = null;

    public static function getConnection(): PDO
    {
        if (self::$pdo === null) {
            $host = defined('DB_HOST') ? DB_HOST : (getenv('DB_HOST') ?: 'localhost');
            $dbName = defined('DB_NAME') ? DB_NAME : (getenv('DB_NAME') ?: 'finflow');
            $user = defined('DB_USER') ? DB_USER : (getenv('DB_USER') ?: 'root');
            $pass = defined('DB_PASS') ? DB_PASS : (getenv('DB_PASS') ?: '');

            $dsn = "mysql:host=$host;dbname=$dbName;charset=utf8mb4";

            try {
                self::$pdo = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                // In production, log this and show generic error
                http_response_code(500);
                echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
                exit;
            }
        }
        return self::$pdo;
    }
}
