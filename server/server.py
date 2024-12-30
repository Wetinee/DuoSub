from flask import Flask, request, jsonify, send_file
import yt_dlp
import os
from datetime import datetime
from combine_subs import combine_subtitles
from flask_cors import CORS
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


def simplify_url(url):
    parsed_url = urlparse(url)

    query_params = parse_qs(parsed_url.query)

    # Keep only 'v' and 'ab_channel' params
    filtered_params = {
        key: value[0]
        for key, value in query_params.items()
        if key in ["v", "ab_channel"]
    }

    # Reconstruct the URL
    new_query = urlencode(filtered_params)
    simplified_url = urlunparse(parsed_url._replace(query=new_query))

    return simplified_url


@app.route("/download", methods=["GET"])
def download():
    video_url = request.args.get("video_url")
    video_url = simplify_url(video_url)
    lang1 = request.args.get("lang1")
    try:
        lang2 = request.args.get("lang2")
    except:
        lang2 = ""

    if not video_url or not lang1:
        return jsonify({"message": "Invalid request data"}), 400

    try:
        # Create a directory with the current timestamp
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        os.makedirs(timestamp, exist_ok=True)

        # yt-dlp options for downloading subtitles
        if lang2 == "":
            ydl_opts = {
                "writesubtitles": True,
                "subtitleslangs": lang1,
                "skip_download": True,  # Skip video download, only get subtitles
                "outtmpl": os.path.join(
                    timestamp, f"%(title)s.%(ext)s"
                ),  # Output template for subtitle files
                "postprocessors": [
                    {
                        "key": "FFmpegSubtitlesConvertor",
                        "format": "vtt",  # Ensure subtitles are in VTT format
                    }
                ],
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])

            # Find and return the subtitle file
            subtitle_file = None
            for file in os.listdir(timestamp):
                if file.endswith(f"{lang1}.vtt"):
                    subtitle_file = os.path.join(timestamp, file)
                    break

            if subtitle_file:
                return send_file(
                    subtitle_file,
                    as_attachment=True,
                    download_name=f"{lang1}_subtitles.vtt",
                    mimetype="text/vtt",
                )
            else:
                return jsonify({"message": "Subtitle file not found"}), 500

        ydl_opts = {
            "writesubtitles": True,
            "subtitleslangs": [lang1, lang2],
            "skip_download": True,  # Skip video download, only get subtitles
            "outtmpl": os.path.join(
                timestamp, f"%(title)s.%(ext)s"
            ),  # Output template for subtitle files
            "postprocessors": [
                {
                    "key": "FFmpegSubtitlesConvertor",
                    "format": "vtt",  # Ensure subtitles are in VTT format
                }
            ],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])

        # Rename the downloaded subtitle files
        for file in os.listdir(timestamp):
            if file.endswith(f"{lang1}.vtt"):
                os.rename(
                    os.path.join(timestamp, file),
                    os.path.join(timestamp, f"{lang1}.vtt"),
                )
            elif file.endswith(f"{lang2}.vtt"):
                os.rename(
                    os.path.join(timestamp, file),
                    os.path.join(timestamp, f"{lang2}.vtt"),
                )

        combined_file_path = combine_subtitles(timestamp, lang1, lang2)

        return send_file(
            combined_file_path,
            as_attachment=True,
            download_name="combined_subtitles.vtt",
            mimetype="text/vtt",
        )
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
