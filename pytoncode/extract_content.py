
import json

def extract_and_print_content(json_file_path):
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    output_lines = []

    for main_title, sub_titles_data in data.items():
        output_lines.append(f"العنوان الرئيسي: {main_title}")
        for sub_title, items in sub_titles_data.items():
            output_lines.append(f"العنوان الفرعي: {sub_title}")
            for item in items:
                output_lines.append(f"#{item['title']}")
                for detail_key, detail_value in item['details'].items():
                    if detail_key == "روابط":
                        if detail_value:
                            output_lines.append(f"@{detail_key}:")
                            for link in detail_value:
                                output_lines.append(link)
                    elif detail_key.startswith("نموذج") and detail_value:
                        # If it's a model link that was extracted as a separate detail, print it
                        # This handles cases where 'نموذج 4o' or 'نموذج 5' might have been stored as separate keys
                        # and are not part of the 'روابط' list.
                        output_lines.append(f"@{detail_key}: {detail_value}")
                    elif detail_value:
                        output_lines.append(f"@{detail_key}: {detail_value}")
                output_lines.append("________________________________________") # Separator for items
        output_lines.append("________________________________________") # Separator for sub-titles

    return "\n".join(output_lines)

if __name__ == "__main__":
    json_file = "output.json"
    extracted_text = extract_and_print_content(json_file)
    
    # Save the extracted text to a file for review
    with open("extracted_content.txt", "w", encoding="utf-8") as f:
        f.write(extracted_text)
    print("تم استخراج المحتوى إلى extracted_content.txt بنجاح.")


