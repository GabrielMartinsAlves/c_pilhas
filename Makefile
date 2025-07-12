# Makefile for RPN Calculator

CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c99
LDFLAGS = -lm
TARGET = rpn_calculator
SOURCE = RPN_calculator.c

# Default target
all: $(TARGET)

# Build the calculator
$(TARGET): $(SOURCE)
	$(CC) $(CFLAGS) -o $(TARGET) $(SOURCE) $(LDFLAGS)

# Debug build
debug: CFLAGS += -g -DDEBUG
debug: $(TARGET)

# Clean build artifacts
clean:
	rm -f $(TARGET)

# Run the calculator
run: $(TARGET)
	./$(TARGET)

# Test with a simple expression
test: $(TARGET)
	@echo "Testing basic addition: 3 4 +"
	@echo "1" | echo "3 4 +" | ./$(TARGET) || true

# Help
help:
	@echo "Available targets:"
	@echo "  all     - Build the RPN calculator (default)"
	@echo "  debug   - Build with debug symbols"
	@echo "  clean   - Remove build artifacts"
	@echo "  run     - Build and run the calculator"
	@echo "  test    - Quick functionality test"
	@echo "  help    - Show this help message"

.PHONY: all debug clean run test help