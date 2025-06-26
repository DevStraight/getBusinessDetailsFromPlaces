import csv
import re
from collections import Counter
import os

def retrieve_unique_frequent_words_to_csv(
    input_csv_path,
    output_csv_path,
    duplicate_threshold=3,
    case_sensitive=True,
    delimiter=',',
    quotechar='"'
):
    """
    Reads a CSV file, identifies words that appear 'duplicate_threshold' or more times
    across the entire file, and then *keeps only unique occurrences* of those frequent
    words within each field of the output CSV. All other words are removed.

    Args:
        input_csv_path (str): The path to the input CSV file.
        output_csv_path (str): The path for the new output CSV file.
        duplicate_threshold (int): Words appearing this many times or more will be KEPT.
                                   (e.g., 3 means words with 3, 4, 5... occurrences are kept).
        case_sensitive (bool): If True, "Word" and "word" are counted as different.
                               If False, they are counted as the same for frequency counting
                               and uniqueness checks.
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
                for field in row:
                    # Clean and split words for frequency counting
                    processed_field = re.sub(r'[^\w\s]', '', field) # Keep only alphanumeric and whitespace
                    words_in_field = processed_field.split()
                    for word in words_in_field:
                        if not case_sensitive:
                            word = word.lower() # Convert to lowercase for counting
                        all_words.append(word)
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
              f"The output CSV '{output_csv_path}' will be created, but all fields will be empty (or headers only).")
        try:
            with open(output_csv_path, 'w', newline='', encoding='utf-8') as outfile:
                writer = csv.writer(outfile, delimiter=delimiter, quotechar=quotechar)
                # Write an empty row for each original row's column count, or just headers if they exist
                if lines_content:
                    for row_num, original_row in enumerate(lines_content):
                        if row_num == 0: # Assuming first row might be header
                            writer.writerow([''] * len(original_row)) # Write empty headers if any
                        else:
                            writer.writerow([''] * len(original_row)) # Write empty fields for data rows
                print(f"Empty or header-only CSV created at '{output_csv_path}'.")
        except Exception as e:
            print(f"Error creating output file when no frequent words: {e}")
        return

    print(f"Identified {len(frequent_words)} words to KEEP (appearing {duplicate_threshold} or more times):")
    # For large lists, you might want to skip printing all of them
    # print(sorted(list(frequent_words))[:20], "..." if len(frequent_words) > 20 else "")


    # --- Pass 2: Write modified content to the new CSV file, ensuring uniqueness per field ---
    print(f"Pass 2: Writing processed data to '{output_csv_path}'...")
    try:
        with open(output_csv_path, 'w', newline='', encoding='utf-8') as outfile:
            writer = csv.writer(outfile, delimiter=delimiter, quotechar=quotechar)

            for original_row in lines_content:
                new_row = []
                for field in original_row:
                    processed_field = re.sub(r'[^\w\s]', '', field)
                    words_in_field = processed_field.split()
                    
                    filtered_words_for_this_field = []
                    # Use a set to track words already added to THIS specific field's output
                    seen_words_in_this_field = set() 
                    
                    for word in words_in_field:
                        # Determine the word form for checking against frequent_words set
                        word_to_check_freq = word.lower() if not case_sensitive else word
                        
                        # Determine the word form for checking against seen_words_in_this_field set
                        # This ensures uniqueness is applied based on case_sensitive setting
                        word_to_check_unique = word.lower() if not case_sensitive else word

                        # Condition 1: Is it a frequent word?
                        # Condition 2: Has it NOT already been added to this field's output?
                        if word_to_check_freq in frequent_words and \
                           word_to_check_unique not in seen_words_in_this_field:
                            
                            filtered_words_for_this_field.append(word) # Keep original case for the output
                            seen_words_in_this_field.add(word_to_check_unique)
                    
                    new_row.append(' '.join(filtered_words_for_this_field))
                writer.writerow(new_row)

        print(f"Successfully processed and saved to '{output_csv_path}'.")

    except Exception as e:
        print(f"An unexpected error occurred during Pass 2: {e}")

# --- How to use the function (Example) ---
if __name__ == "__main__":
    # Define your input and output file names
    input_file = "noms.csv" # Your input file
    output_file = "noms_unique_frequent.csv" # Your desired output file name

    # Call the function to retrieve only unique occurrences of frequent words
    print("\n--- Running to retrieve ONLY UNIQUE frequent words (Case-Insensitive Mode) ---")
    retrieve_unique_frequent_words_to_csv(
        input_csv_path=input_file,
        output_csv_path=output_file,
        duplicate_threshold=3, # Words appearing 3 or more times globally will be considered frequent
        case_sensitive=False # Count and ensure uniqueness irrespective of case
    )

    print("\nProcess finished.")
    print(f"Check '{output_file}' in your current directory.")