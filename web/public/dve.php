<?php
$file = $_GET["file"] ?? substr($_SERVER["REQUEST_URI"], 5);

if (!empty($file)) {
    $_GET["file"] = $file;
    require __DIR__ . "/utilities/discord-video-embed/get.php";
} else
    header("Location: /utilities/discord-video-embed/");
