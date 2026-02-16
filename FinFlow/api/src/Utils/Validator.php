<?php

namespace FinFlow\Utils;

class Validator
{
    public static function required(array $data, array $fields): void
    {
        foreach ($fields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                Response::error("O campo '$field' é obrigatório.");
            }
        }
    }

    public static function email(string $email): void
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error("O e-mail '$email' é inválido.");
        }
    }

    public static function length(string $value, int $min, string $fieldName): void
    {
        if (strlen($value) < $min) {
            Response::error("O campo '$fieldName' deve ter pelo menos $min caracteres.");
        }
    }
}
