<?php

$id = @$_REQUEST['id'];
if (!preg_match('/^[a-zA-Z_0-9:-]+$/',$id)) $id = "";

$unapi = "http://unapi.gbv.de/";
$url   = "$unapi?id=$id&format=pp";

$content = @file_get_contents($url);
if ($content === false) $error = "record not found";

/*
$curl  = curl_init($url);

curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curl, CURLOPT_TIMEOUT, 8);

$content = curl_exec($curl);
$info = curl_getinfo($curl);

if ($content === false || $info['http_code'] != 200) {
  $error = curl_error($curl);
}
*/

if ($error) {
  $json = array(
    "name"    => $id,
    "error" => $error
  );
} else {
  $json = array(
    "value" => $content,
    "name"  => $id,
  );
}

$callback = @$_REQUEST['callback'];
$json = json_encode($json);
if (preg_match('/^[a-z_][a-z_0-9]*$/i',$callback)) {
  print "$callback($json);";
} else {
  print $json;
}

?>
