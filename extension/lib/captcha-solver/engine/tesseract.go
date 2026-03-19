package engine

import (
	"bytes"
	"image"
	"image/color"
	"os/exec"
	"strings"

	"github.com/disintegration/imaging"
)

func Solve(imageBytes []byte) (string, error) {
	// 1. Decode the image
	src, _, err := image.Decode(bytes.NewReader(imageBytes))
	if err != nil {
		return "", err
	}

	// 2. Preprocessing: Resize (3x larger) and Grayscale
	dst := imaging.Resize(src, src.Bounds().Dx()*3, 0, imaging.Lanczos)
	gray := imaging.Grayscale(dst)

	// 3. Optimized Binarization Loop
	width, height := gray.Bounds().Dx(), gray.Bounds().Dy()
	binarized := image.NewGray(gray.Bounds())

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			// Use blank identifiers (_) for g and b since they aren't used
			r, _, _, _ := gray.At(x, y).RGBA()
			
			// Convert 16-bit color to 8-bit [0-255]
			intensity := uint8(r >> 8) 

			// Apply threshold to remove light noise lines
			if intensity < 180 { 
				binarized.SetGray(x, y, color.Gray{Y: 0})
			} else {
				binarized.SetGray(x, y, color.Gray{Y: 255})
			}
		}
	}

	// 4. Encode back to bytes to send to Tesseract
	var buf bytes.Buffer
	imaging.Encode(&buf, binarized, imaging.PNG)

	// 5. Run Tesseract with Optimized Flags
	// PSM 8 (Single Word) and OEM 1 (LSTM Neural Net) are best for this
	cmd := exec.Command("tesseract", "stdin", "stdout", "--psm", "8", "--oem", "1", "-c", "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	cmd.Stdin = &buf
	
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return "", err
	}

	return strings.TrimSpace(out.String()), nil
}