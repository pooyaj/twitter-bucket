<?php
// authentication info will be loaded from another file for 
// security reasons. A $config variable is defined in the file. 
include 'authentication_info.php';

/*
$config = array(
    'oauth_access_token' => '',
    'oauth_access_token_secret' => '',
    'consumer_key' => '',
    'consumer_secret' => '',
    'base_url' => 'https://api.twitter.com/1.1/'
);
*/

// Get the query string
$query = $_SERVER['QUERY_STRING'];

// create the url for calling twitter API
$url = 'search/tweets.json?' . $query;

// Figure out the URL parmaters
$url_parts = parse_url($url);
parse_str($url_parts['query'], $url_arguments);

$full_url = $config['base_url'] . $url; // Url with the query on it.
$base_url = $config['base_url'] . $url_parts['path']; // Url without the query.

/**
 * Code below from http://stackoverflow.com/questions/12916539/simplest-php-example-retrieving-user-timeline-with-twitter-api-version-1-1 by Rivers
 * with a few modfications by Mike Rogers to support variables in the URL nicely
 */

function buildBaseString($baseURI, $method, $params)
{
    $r = array();
    ksort($params);
    foreach ($params as $key => $value) {
        $r[] = "$key=" . rawurlencode($value);
    }
    return $method . "&" . rawurlencode($baseURI) . '&' . rawurlencode(implode('&', $r));
}

function buildAuthorizationHeader($oauth)
{
    $r = 'Authorization: OAuth ';
    $values = array();
    foreach ($oauth as $key => $value)
        $values[] = "$key=\"" . rawurlencode($value) . "\"";
    $r .= implode(', ', $values);
    return $r;
}

// Set up the oauth Authorization array
$oauth = array(
    'oauth_consumer_key' => $config['consumer_key'],
    'oauth_nonce' => time(),
    'oauth_signature_method' => 'HMAC-SHA1',
    'oauth_token' => $config['oauth_access_token'],
    'oauth_timestamp' => time(),
    'oauth_version' => '1.0'
);

// Generating the oauth signature according to https://dev.twitter.com/docs/auth/creating-signature
$to_be_signed = array_merge($oauth, $url_arguments);
$base_string = buildBaseString($base_url, 'GET', $to_be_signed);
$signing_key = rawurlencode($config['consumer_secret']) . '&' . rawurlencode($config['oauth_access_token_secret']);
$oauth_signature = base64_encode(hash_hmac('sha1', $base_string, $signing_key, true));
$oauth['oauth_signature'] = $oauth_signature;

// Make Requests
$header = array(
    buildAuthorizationHeader($oauth),
    'Expect:'
);
$options = array(
    CURLOPT_HTTPHEADER => $header,
    CURLOPT_HEADER => false,
    CURLOPT_URL => $full_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false
);

$feed = curl_init();
curl_setopt_array($feed, $options);
$result = curl_exec($feed);
$info = curl_getinfo($feed);
curl_close($feed);

// send header and contents back
if (isset($info['content_type']) && isset($info['size_download'])) {
    header('Content-Type: ' . $info['content_type']);
    header('Content-Length: ' . $info['size_download']);
}

echo $result;
?>