import json
import csv

def extract_noms_to_csv(json_file_path, csv_file_path):
    """
    Extracts all 'nom' fields from a JSON file (assuming it's an array of objects)
    and saves them to a CSV file.

    Args:
        json_file_path (str): The path to the input JSON file.
        csv_file_path (str): The path to the output CSV file.
    """
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if not isinstance(data, list):
            print("Error: The JSON file does not appear to be an array of objects.")
            return

        noms = []
        for item in data:
            if isinstance(item, dict) and "nom" in item:
                noms.append(item["nom"])
            else:
                print(f"Warning: Item {item} does not have a 'nom' field or is not a dictionary. Skipping.")

        if not noms:
            print("No 'nom' fields found in the JSON data.")
            return

        with open(csv_file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Nom'])  # Write the header
            for nom in noms:
                writer.writerow([nom])

        print(f"Successfully extracted 'nom' fields to '{csv_file_path}'")

    except FileNotFoundError:
        print(f"Error: JSON file not found at '{json_file_path}'")
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{json_file_path}'. Please check the file's format.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# --- How to use the function ---
if __name__ == "__main__":
    json_input_file = "all_fraiseetlocal_records.json"  
    csv_output_file = "noms.csv"    

    extract_noms_to_csv(json_input_file, csv_output_file)

import json
import csv
import os

def extract_noms_to_csv_from_cwd(json_file_name="data.json", csv_file_name="noms.csv"):
    """
    Extracts all 'nom' fields from a JSON file located in the Current Working Directory (CWD)
    (assuming the JSON is an array of objects) and saves them to a CSV file in the CWD.

    Args:
        json_file_name (str): The name of the input JSON file (expected in CWD). Default is "data.json".
        csv_file_name (str): The name of the output CSV file (will be created in CWD). Default is "noms.csv".
    """
    # Construct full paths relative to the CWD
    json_file_path = os.path.join(os.getcwd(), json_file_name)
    csv_file_path = os.path.join(os.getcwd(), csv_file_name)

    print(f"Looking for JSON file at: {json_file_path}")
    print(f"CSV file will be created at: {csv_file_path}")

    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if not isinstance(data, list):
            print("Error: The JSON file does not appear to be an array of objects. "
                  "Please ensure your top-level JSON structure is an array `[...]`.")
            return

        noms = []
        for item in data:
            if isinstance(item, dict) and "nom" in item:
                noms.append(item["nom"])
            else:
                # This warning is helpful for debugging if some items don't have 'nom'
                # or are not dictionaries, but you might comment it out for very large files.
                print(f"Warning: Item {item} does not have a 'nom' field or is not a dictionary. Skipping.")

        if not noms:
            print("No 'nom' fields found in the JSON data. The CSV file will still be created with a header.")
            # Optionally, you might choose to not create the CSV if no noms are found:
            # return

        with open(csv_file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Nom'])  # Write the header
            for nom in noms:
                writer.writerow([nom])

        print(f"Successfully extracted 'nom' fields to '{csv_file_name}' in the current directory.")

    except FileNotFoundError:
        print(f"Error: JSON file not found at '{json_file_path}'. "
              "Please make sure your JSON file ('{json_file_name}') is in the same directory as this script, or provide its full path.")
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{json_file_name}'. Please check the file's format for syntax errors.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# --- How to use the function ---
if __name__ == "__main__":
    # You can change these names if your JSON or desired CSV file names are different
    my_json_file = "all_fraisetlocal_records.json"
    my_csv_file = "noms.csv"

    # Call the function to perform the extraction
    extract_noms_to_csv_from_cwd(my_json_file, my_csv_file)