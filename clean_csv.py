import csv
import re
from collections import Counter
import os

def remove_frequent_words_from_csv(
    input_csv_path,
    output_csv_path,
    duplicate_threshold=3,
    case_sensitive=True,
    delimiter=',',
    quotechar='"'
):
    """
    Reads a CSV file, identifies words that appear 'duplicate_threshold' or more times
    across the entire file, and then removes those words from each line when
    writing to a new CSV file.

    Args:
        input_csv_path (str): The path to the input CSV file.
        output_csv_path (str): The path for the new output CSV file.
        duplicate_threshold (int): Words appearing this many times or more will be removed.
                                   (e.g., 3 means words with 3, 4, 5... occurrences are removed).
        case_sensitive (bool): If True, "Word" and "word" are counted as different.
                               If False, they are counted as the same.
        delimiter (str): The delimiter used in your CSV file (e.g., ',', ';', '\t').
        quotechar (str): The character used to quote fields in your CSV file.
    """

    all_words = []
    lines_content = [] # Store all lines to process them in the second pass

    # --- Pass 1: Count word frequencies across the entire file ---
    print(f"Pass 1: Counting word frequencies from '{input_csv_path}'...")
    try:
        with open(input_csv_path, 'r', newline='', encoding='utf-8') as infile:
            reader = csv.reader(infile, delimiter=delimiter, quotechar=quotechar)
            for i, row in enumerate(reader):
                line_words = []
                for field in row:
                    # Clean and split words
                    # Remove punctuation and split by whitespace
                    processed_field = re.sub(r'[^\w\s]', '', field) # Keep only alphanumeric and whitespace
                    words_in_field = processed_field.split()
                    for word in words_in_field:
                        if not case_sensitive:
                            word = word.lower() # Convert to lowercase if not case sensitive
                        all_words.append(word)
                        line_words.append(word) # Store for later reconstruction (if needed)
                lines_content.append(row) # Store original rows for Pass 2

    except FileNotFoundError:
        print(f"Error: Input CSV file not found at '{input_csv_path}'")
        return
    except Exception as e:
        print(f"An error occurred during Pass 1: {e}")
        return

    word_counts = Counter(all_words)
    frequent_words = {word for word, count in word_counts.items() if count >= duplicate_threshold}

    if not frequent_words:
        print(f"No words found with {duplicate_threshold} or more occurrences. "
              f"Copying '{input_csv_path}' to '{output_csv_path}' without changes.")
        # If no words meet the criteria, just copy the file
        try:
            os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)
            with open(input_csv_path, 'r', encoding='utf-8') as src, \
                 open(output_csv_path, 'w', encoding='utf-8') as dest:
                dest.write(src.read())
            print("Done.")
        except Exception as e:
            print(f"Error copying file: {e}")
        return

    print(f"Identified {len(frequent_words)} words to remove (appearing {duplicate_threshold} or more times):")
    # For large lists, you might want to skip printing all of them
    # print(sorted(list(frequent_words))[:20], "..." if len(frequent_words) > 20 else "")

    # --- Pass 2: Write modified content to the new CSV file ---
    print(f"Pass 2: Writing processed data to '{output_csv_path}'...")
    try:
        os.makedirs(os.path.dirname(output_csv_path), exist_ok=True) # Ensure output directory exists
        with open(output_csv_path, 'w', newline='', encoding='utf-8') as outfile:
            writer = csv.writer(outfile, delimiter=delimiter, quotechar=quotechar)

            for original_row in lines_content:
                new_row = []
                for field in original_row:
                    processed_field = re.sub(r'[^\w\s]', '', field)
                    words_in_field = processed_field.split()
                    
                    filtered_words = []
                    for word in words_in_field:
                        word_to_check = word.lower() if not case_sensitive else word
                        if word_to_check not in frequent_words:
                            filtered_words.append(word) # Keep original case for the output
                    
                    new_row.append(' '.join(filtered_words))
                writer.writerow(new_row)

        print(f"Successfully processed and saved to '{output_csv_path}'.")

    except Exception as e:
        print(f"An error occurred during Pass 2: {e}")

if __name__ == "__main__":
    # Define your input and output file names
    input_file = "noms.csv"
    output_file = "noms_cleaned.csv"

    # Call the function to remove words with 3 or more duplicates
    # Case-insensitive example: "apple", "Apple" will be counted as the same.
    print("\n--- Running with Case-Insensitive Mode ---")
    remove_frequent_words_from_csv(
        input_csv_path=input_file,
        output_csv_path=output_file,
        duplicate_threshold=3,
        case_sensitive=False # Set to False for case-insensitive counting
    )

    print("\nProcess finished.")
    print(f"Check '{output_file}' in your current directory.")