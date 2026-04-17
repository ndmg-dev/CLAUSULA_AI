from PIL import Image
import pytesseract

img = Image.open('media.png')
text = pytesseract.image_to_string(img)
for line in text.split('\n'):
    if 'apiKey' in line:
        print("FOUND API KEY LINE:", line)
