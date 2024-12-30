import os


def combine_subtitles(directory, lang1, lang2):
    # Find subtitle files in the directory
    lang1_file = None
    lang2_file = None

    for file in os.listdir(directory):
        if file.endswith(f"{lang1}.vtt"):
            lang1_file = os.path.join(directory, file)
        elif file.endswith(f"{lang2}.vtt"):
            lang2_file = os.path.join(directory, file)

    if not lang1_file or not lang2_file:
        raise FileNotFoundError("Subtitle files not found for the specified languages.")

    # Read and combine subtitles
    with open(lang1_file, "r", encoding="utf-8") as f1, open(
        lang2_file, "r", encoding="utf-8"
    ) as f2:
        lang1_lines = f1.readlines()
        lang2_lines = f2.readlines()

    def read_file(content):
        segments = []
        current_timestamp = None
        current_text = []
        for line in content:
            line = line.strip()
            if line.startswith(("WEBVTT", "Kind:", "Language:")):
                continue
            if "-->" in line:  # Timestamp line
                if current_timestamp and current_text:
                    segments.append((current_timestamp, " ".join(current_text)))
                    current_text = []
                current_timestamp = line
            elif line:  # Text line
                current_text.append(line)

        # Append the last segment if exists
        if current_timestamp and current_text:
            segments.append((current_timestamp, " ".join(current_text)))
        return segments

    segments1 = read_file(lang1_lines)
    segments2 = read_file(lang2_lines)

    def combine_vtt_files(original_segments, translated_segments):
        """
        Combines the original and translated segments into a new VTT file.

        Args:
            original_segments (list): List of tuples containing timestamps and original text segments.
            translated_segments (list): List of tuples containing timestamps and translated text segments.
            output_path (str): Path to the output VTT file.
        """
        output_path = os.path.join(directory, "combined_subtitles.vtt")
        with open(output_path, "w", encoding="utf-8") as file:
            file.write("WEBVTT\n\n")
            for (timestamp, original_text), (_, translated_text) in zip(
                original_segments, translated_segments
            ):
                file.write(f"{timestamp}\n{original_text}\n{translated_text}\n\n")
        return output_path

    return combine_vtt_files(segments1, segments2)
