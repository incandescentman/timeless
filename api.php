<?php
// --- Configuration & Setup ---

// Set error reporting to log errors (adjust path as needed)
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_error.log'); // Log PHP errors to a file
error_reporting(E_ALL); // Report all errors and warnings during development

// Define file paths using __DIR__ for reliability
$dataFile = __DIR__ . '/calendar_data.json';
$logFile = __DIR__ . '/api_activity.log'; // Separate log for script activity

// --- CORS Headers (Allow requests from your web domain) ---
// Replace * with your actual domain in production for better security
// e.g., header("Access-Control-Allow-Origin: https://jaydixit.com");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Allow OPTIONS for preflight requests
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle OPTIONS preflight request (important for CORS with Content-Type header)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    // Just acknowledge the headers are allowed and exit.
    http_response_code(200);
    exit;
}

// --- Shared Function for Logging Script Activity ---
function log_message($message) {
    global $logFile;
    // Add microtime for finer granularity
    $timestamp = date('Y-m-d H:i:s') . '.' . substr((string)microtime(true), 11, 4);
    // Add remote IP for context
    $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? 'Unknown IP';
    file_put_contents($logFile, "[$timestamp] [$remoteAddr] - " . $message . "\n", FILE_APPEND | LOCK_EX); // Added LOCK_EX
}

// --- Request Method Handling ---

// == GET Request ==
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    log_message("GET request received.");

    // Set Headers specific to GET response
    header('Content-Type: application/json');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache'); // For older browsers/proxies
    header('Expires: 0'); // For older browsers/proxies

    if (file_exists($dataFile)) {
        log_message("Data file exists: " . $dataFile);
        clearstatcache(true, $dataFile); // Clear file status cache before reading
        $content = file_get_contents($dataFile);

        if ($content === false) {
            log_message("ERROR reading data file.");
            http_response_code(500);
            echo json_encode(["error" => "Failed to read data file."]);
        } else {
            log_message("Read " . strlen($content) . " bytes.");
            // Validate JSON before sending
            json_decode($content);
            if (json_last_error() === JSON_ERROR_NONE) {
                log_message("Data is valid JSON. Sending.");
                echo $content; // Send the valid JSON content
            } else {
                log_message("ERROR: Data file contains invalid JSON (json_last_error: " . json_last_error() . "). Sending empty object instead.");
                // Decide: Send error or empty object? Sending empty might be safer for client.
                 // http_response_code(500);
                 // echo json_encode(["error" => "Data file corrupted."]);
                 echo json_encode(new stdClass()); // Send empty object {}
            }
        }
    } else {
        log_message("Data file not found, sending empty JSON object {}.");
        echo json_encode(new stdClass()); // Use stdClass for empty object {}
    }
    exit; // Crucial: stop script execution after handling GET
}

// == POST Request ==
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    log_message("POST request received.");
    header('Content-Type: application/json'); // Ensure JSON header for POST response too

    $rawInput = file_get_contents("php://input");
    log_message("Raw POST data length: " . strlen($rawInput) . " bytes.");

    // Decode the JSON input
    $decoded = json_decode($rawInput, true); // Decode as associative array

    // Validate JSON decoding
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        log_message("ERROR: Invalid JSON received. Error code: " . json_last_error() . " (" . json_last_error_msg() . ")");
        http_response_code(400); // Bad Request
        echo json_encode(["status" => "error", "message" => "Invalid JSON format received"]);
        exit;
    }

    // Basic validation: Ensure it's an array (or object decoded as array)
    if (!is_array($decoded)) {
        log_message("ERROR: Decoded JSON is not an array/object.");
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Expected JSON object/array"]);
        exit;
    }

    // Add/update the server-side timestamp (using milliseconds)
    $serverTimestamp = (string)round(microtime(true) * 1000);
    $decoded['lastSavedTimestamp'] = $serverTimestamp;
    log_message("Data prepared for save. Server timestamp set to: " . $serverTimestamp);

    // Re-encode the data with the updated timestamp
    $jsonData = json_encode($decoded, JSON_PRETTY_PRINT);
    if ($jsonData === false) {
        log_message("ERROR: Failed to re-encode JSON data. Error code: " . json_last_error() . " (" . json_last_error_msg() . ")");
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Server error encoding data"]);
        exit;
    }

    // --- Check file/directory writability before attempting write ---
    $dir = dirname($dataFile);
    if (!is_dir($dir)) {
        // Attempt to create directory if it doesn't exist
        if (!mkdir($dir, 0755, true)) { // Recursive creation with permissions
             log_message("ERROR: Directory does not exist and could not be created: " . $dir);
             http_response_code(500);
             echo json_encode(["status" => "error", "message" => "Server configuration error (cannot create directory)."]);
             exit;
        }
         log_message("Created directory: " . $dir);
    }

    if (!is_writable($dir)) {
         log_message("ERROR: Directory is NOT writable: " . $dir);
         http_response_code(500); // Internal Server Error
         echo json_encode(["status" => "error", "message" => "Server permission error (directory not writable)."]);
         exit;
    }
    if (file_exists($dataFile) && !is_writable($dataFile)) {
         log_message("ERROR: File exists but is NOT writable: " . $dataFile);
         http_response_code(500);
         echo json_encode(["status" => "error", "message" => "Server permission error (file not writable)."]);
         exit;
    }
    // --- End explicit checks ---

    // Attempt to write the file
    log_message("Attempting file_put_contents to: " . $dataFile);
    $result = file_put_contents($dataFile, $jsonData, LOCK_EX); // Use LOCK_EX for safety

    if ($result === false) {
        log_message("ERROR: file_put_contents returned false! Check PHP error log (php_error.log) for details.");
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Server failed to save data."]);
    } else {
        log_message("SUCCESS: Saved " . $result . " bytes to " . $dataFile);
        clearstatcache(true, $dataFile); // Clear file status cache after write
        // Send success response including the timestamp used
        echo json_encode(["status" => "ok", "savedTimestamp" => $serverTimestamp]);
    }
    exit; // Crucial: stop script execution after handling POST
}

// == Fallback for other methods ==
log_message("Invalid request method received: " . $_SERVER['REQUEST_METHOD']);
header('Content-Type: application/json'); // Ensure JSON header for error response
http_response_code(405); // Method Not Allowed
echo json_encode(["error" => "Method not allowed"]);
exit;
?>
 