<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

$dataFile = __DIR__ . '/calendar_data.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        echo file_get_contents($dataFile);
    } else {
        echo "{}";
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents("php://input");
    $decoded = json_decode($rawInput, true);
    if (!is_array($decoded)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON"]);
        exit;
    }
    file_put_contents($dataFile, json_encode($decoded, JSON_PRETTY_PRINT));
    echo json_encode(["status" => "ok"]);
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
exit;
