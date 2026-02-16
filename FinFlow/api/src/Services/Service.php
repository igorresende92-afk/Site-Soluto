<?php

namespace FinFlow\Services;

use PDO;
use FinFlow\Config\Database;

abstract class Service
{
    protected PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }
}
