<?php
// Set error reporting to log errors (adjust path as needed)
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_error.log'); // Log errors to a file in the same directory
error_reporting(E_ALL); // Report all errors and warnings

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json'); // Set JSON header early for all responses

$dataFile = __DIR__ . '/calendar_data.json';
$logFile = __DIR__ . '/api_activity.log'; // Separate log for script activity

function log_message($message) {
    global $logFile;
    // Add microtime for finer granularity
    file_put_contents($logFile, date('Y-m-d H:i:s') . '.' . substr((string)microtime(true), 11, 4) . " - " . $message . "\n", FILE_APPEND);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    log_message("GET request received.");
    if (file_exists($dataFile)) {
        log_message("Data file exists. Reading...");
        clearstatcache(true, $dataFile); // <--- Try clearing file status cache
        $content = file_get_contents($dataFile);
        if ($content === false) {
            log_message("ERROR reading data file: " . $dataFile);
            http_response_code(500);
            echo json_encode(["error" => "Failed to read data file."]);
        } else {
            log_message("Read " . strlen($content) . " bytes. First 100 chars: " . substr($content, 0, 100)); // Log part of content
            json_decode($content);
            if (json_last_error() === JSON_ERROR_NONE) {
                log_message("Data is valid JSON. Sending.");
                echo $content;
            } else {
                log_message("ERROR: Data file contains invalid JSON.");
                http_response_code(500);
                echo json_encode(["error" => "Data file corrupted."]);
            }
        }
    } else {
        log_message("Data file not found, sending empty JSON {}.");
        echo "{}";
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    log_message("POST request received.");
    $rawInput = file_get_contents("php://input");
    // Limit log size for raw input if it's huge
    log_message("Raw POST data (first 500 chars): " . substr($rawInput, 0, 500));

    $decoded = json_decode($rawInput, true);

    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        log_message("ERROR: Invalid JSON received. Error: " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid JSON received"]);
        exit;
    }
    if (!is_array($decoded)) { /* ... error handling ... */ }

    // Add/update timestamp
    $decoded['lastSavedTimestamp'] = (string)round(microtime(true) * 1000);
    log_message("Data prepared for save. Timestamp: " . $decoded['lastSavedTimestamp']);

    $jsonData = json_encode($decoded, JSON_PRETTY_PRINT);
    if ($jsonData === false) { /* ... error handling ... */ }

    log_message("Attempting file_put_contents to: " . $dataFile);
    // --- Explicitly check file existence and writability before writing ---
    if (file_exists($dataFile) && !is_writable($dataFile)) {
         log_message("ERROR: File exists but is NOT writable: " . $dataFile);
         http_response_code(500);
         echo json_encode(["status" => "error", "message" => "Server permission error (file not writable)."]);
         exit;
    }
    if (!file_exists($dataFile) && !is_writable(dirname($dataFile))) {
         log_message("ERROR: File does not exist AND directory is NOT writable: " . dirname($dataFile));
         http_response_code(500);
         echo json_encode(["status" => "error", "message" => "Server permission error (directory not writable)."]);
         exit;
    }
    // --- End explicit checks ---

    $result = file_put_contents($dataFile, $jsonData);

    if ($result === false) {
        log_message("ERROR: file_put_contents returned false! PHP Last Error: " . print_r(error_get_last(), true));
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Server failed to save data."]);
    } else {
        log_message("SUCCESS: Saved " . $result . " bytes.");
        clearstatcache(true, $dataFile); // <--- Try clearing file status cache after write
        echo json_encode(["status" => "ok", "savedTimestamp" => $decoded['lastSavedTimestamp']]);
    }
    exit;
}

// If neither GET nor POST
log_message("Invalid request method: " . $_SERVER['REQUEST_METHOD']);
http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
exit;
?>
