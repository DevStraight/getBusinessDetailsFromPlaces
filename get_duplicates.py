import csv
import re
from collections import Counter
import os

def get_unique_frequent_words(
    input_csv_path,
    output_csv_path,
    duplicate_threshold=3,
    case_sensitive=False, # This is set to False by default for your use case (e.g., "Ferme" and "FERME" are treated as the same)
    delimiter=',',
    quotechar='"'
):
    """
    Reads a CSV file, identifies words that appear 'duplicate_threshold' or more times
    across the entire file, and then writes a new CSV file containing only the
    unique list of these frequent words (one per line).

    Args:
        input_csv_path (str): The path to the input CSV file.
        output_csv_path (str): The path for the new output CSV file, which will
                                contain a single column of unique frequent words.
        duplicate_threshold (int): Words appearing this many times or more will be included
                                   in the output list.
        case_sensitive (bool): If True, "Word" and "word" are counted as different.
                               If False, they are counted as the same.
        delimiter (str): The delimiter used in your input CSV file.
        quotechar (str): The character used to quote fields in your input CSV file.
    """

    all_words = []

    # --- Pass 1: Count word frequencies across the entire file ---
    print(f"Pass 1: Counting word frequencies from '{input_csv_path}'...")
    try:
        with open(input_csv_path, 'r', newline='', encoding='utf-8') as infile:
            reader = csv.reader(infile, delimiter=delimiter, quotechar=quotechar)
            for row in reader:
                for field in row:
                    # Clean and split words
                    # Remove punctuation and split by whitespace
                    processed_field = re.sub(r'[^\w\s]', '', field) # Keep only alphanumeric and whitespace
                    words_in_field = processed_field.split()
                    for word in words_in_field:
                        # Normalize word to lowercase if case_sensitive is False
                        # This is KEY for "FERME", "Ferme" to be counted as one
                        if not case_sensitive:
                            word = word.lower()
                        all_words.append(word)

    except FileNotFoundError:
        print(f"Error: Input CSV file not found at '{input_csv_path}'")
        return
    except Exception as e:
        print(f"An error occurred during Pass 1: {e}")
        return

    word_counts = Counter(all_words)
    # The set 'frequent_words' naturally stores only unique words.
    # Because words were lowercased (if case_sensitive=False),
    # "ferme" will appear only once here.
    frequent_words = {word for word, count in word_counts.items() if count >= duplicate_threshold}

    if not frequent_words:
        print(f"No words found with {duplicate_threshold} or more occurrences. "
              f"The output CSV '{output_csv_path}' will be created, but it will be empty (or header-only).")
        try:
            with open(output_csv_path, 'w', newline='', encoding='utf-8') as outfile:
                writer = csv.writer(outfile, delimiter=',') # Default to comma for single column output
                writer.writerow(['Frequent Word']) # Write header for clarity
            print(f"Empty or header-only CSV created at '{output_csv_path}'.")
        except Exception as e:
            print(f"Error creating output file when no frequent words: {e}")
        return

    print(f"Identified {len(frequent_words)} unique words that appeared {duplicate_threshold} or more times.")

    # --- Pass 2: Write the unique frequent words to the new CSV file ---
    print(f"Pass 2: Writing unique frequent words to '{output_csv_path}'...")
    try:
        with open(output_csv_path, 'w', newline='', encoding='utf-8') as outfile:
            writer = csv.writer(outfile, delimiter=',') # Force comma delimiter for this output
            writer.writerow(['Frequent Word']) # Write a header

            # Sort the words alphabetically for a clean output (optional but recommended)
            sorted_frequent_words = sorted(list(frequent_words))

            for word in sorted_frequent_words:
                writer.writerow([word]) # Each word becomes a new row in the single column

        print(f"Successfully retrieved and saved {len(sorted_frequent_words)} unique frequent words to '{output_csv_path}'.")

    except Exception as e:
        print(f"An unexpected error occurred during Pass 2: {e}")

# --- How to use the function (Main execution block) ---
if __name__ == "__main__":
    # Define your input and output file names
    input_file = "noms.csv" # <--- IMPORTANT: Ensure your input CSV file is named 'noms.csv' and is in the same directory as this script.
    output_file = "unique_frequent_words.csv" # <--- This will be the name of the new CSV file created in the same directory.

    # Define the threshold for word frequency
    my_duplicate_threshold = 3 # <--- Words appearing 3 or more times globally will be included.

    # Call the function to get unique frequent words
    # case_sensitive=False ensures words like "FERME" and "Ferme" are treated as the same,
    # resulting in a single entry ("ferme") in the output if it meets the threshold.
    print("\n--- Running to retrieve ONLY UNIQUE frequent words across the whole file (Case-Insensitive Mode) ---")
    get_unique_frequent_words(
        input_csv_path=input_file,
        output_csv_path=output_file,
        duplicate_threshold=my_duplicate_threshold, # Pass the defined threshold
        case_sensitive=False # Set to False for case-insensitive counting and output uniqueness
    )

    print("\nProcess finished.")
    print(f"Please check the file '{output_file}' in your current directory for the results.")
    print(f"It should contain words like 'ferme' only once if they met the {my_duplicate_threshold} threshold.")