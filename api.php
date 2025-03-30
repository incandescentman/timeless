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
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . $message . "\n", FILE_APPEND);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    log_message("GET request received.");
    if (file_exists($dataFile)) {
        $content = file_get_contents($dataFile);
        if ($content === false) {
            log_message("ERROR reading data file: " . $dataFile);
            http_response_code(500);
            echo json_encode(["error" => "Failed to read data file."]);
        } else {
            log_message("Sent " . strlen($content) . " bytes from data file.");
            // Ensure content is valid JSON before echoing
            json_decode($content);
            if (json_last_error() === JSON_ERROR_NONE) {
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
    log_message("Raw POST data: " . $rawInput); // Log the received data

    $decoded = json_decode($rawInput, true);

    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        log_message("ERROR: Invalid JSON received. Error: " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid JSON received"]);
        exit;
    }

    // Ensure it's an array (though json_decode true should handle this)
    if (!is_array($decoded)) {
         log_message("ERROR: Decoded JSON is not an array.");
         http_response_code(400);
         echo json_encode(["status" => "error", "message" => "Invalid data format"]);
         exit;
    }

    // Add or update the timestamp *before* saving
    $decoded['lastSavedTimestamp'] = (string)round(microtime(true) * 1000); // Server-side timestamp
    log_message("Attempting to save data with timestamp: " . $decoded['lastSavedTimestamp']);

    // Attempt to save
    $jsonData = json_encode($decoded, JSON_PRETTY_PRINT);
    if ($jsonData === false) {
         log_message("ERROR: Failed to encode data to JSON. Error: " . json_last_error_msg());
         http_response_code(500);
         echo json_encode(["status" => "error", "message" => "Failed to encode data"]);
         exit;
    }

    $result = file_put_contents($dataFile, $jsonData);

    // Check if save succeeded
    if ($result === false) {
        log_message("ERROR: file_put_contents failed! Check permissions and path: " . $dataFile);
        http_response_code(500); // Internal Server Error
        echo json_encode(["status" => "error", "message" => "Server failed to save data."]);
    } else {
        log_message("SUCCESS: Saved " . $result . " bytes to " . $dataFile);
        echo json_encode(["status" => "ok", "savedTimestamp" => $decoded['lastSavedTimestamp']]); // Return the timestamp we saved
    }
    exit;
}

// If neither GET nor POST
log_message("Invalid request method: " . $_SERVER['REQUEST_METHOD']);
http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
exit;
?>
