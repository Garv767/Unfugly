package main

import (
	"captcha-solver/engine"
	"net/http"
	"runtime"

	"github.com/gin-gonic/gin"
)

// Semaphore to limit concurrent Tesseract processes to CPU count
var semaphore = make(chan struct{}, runtime.NumCPU())

func main() {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
    c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
    c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
    c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    if c.Request.Method == "OPTIONS" {
        c.AbortWithStatus(204)
        return
    }
    c.Next()
})

	r.POST("/solve", func(c *gin.Context) {
		// 1. Extract the file from the request
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
			return
		}

		// 2. Open and read the file
		f, _ := file.Open()
		defer f.Close()
		
		imgBytes := make([]byte, file.Size)
		f.Read(imgBytes)

		// 3. Acquire semaphore (wait for a free CPU core)
		semaphore <- struct{}{}
		defer func() { <-semaphore }()

		// 4. Call our engine
		result, err := engine.Solve(imgBytes)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "OCR failed"})
			return
		}

		// 5. Return the result
		c.JSON(http.StatusOK, gin.H{"text": result})
	})

	r.Run(":8000")
}