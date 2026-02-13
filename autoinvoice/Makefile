# AutoInvoice - Build Makefile
# Build Tauri desktop app for macOS and Windows

.PHONY: help install dev build build-macos build-windows clean lint format check

# Default target
help:
	@echo "AutoInvoice Build Commands"
	@echo "=========================="
	@echo ""
	@echo "Development:"
	@echo "  make install     - Install dependencies (npm + cargo)"
	@echo "  make dev         - Run development server"
	@echo "  make check       - Check code (lint + type check + cargo check)"
	@echo "  make lint        - Run ESLint"
	@echo "  make format      - Format code with Prettier"
	@echo ""
	@echo "Build:"
	@echo "  make build       - Build for current platform"
	@echo "  make build-macos - Build for macOS (universal binary)"
	@echo "  make build-windows - Build for Windows (requires cross-compilation setup)"
	@echo ""
	@echo "Utility:"
	@echo "  make clean       - Clean build artifacts"
	@echo ""

# Install all dependencies
install:
	@echo "📦 Installing npm dependencies..."
	npm install
	@echo "🦀 Checking Rust toolchain..."
	rustup update stable
	@echo "✅ Dependencies installed"

# Run development server
dev:
	@echo "🚀 Starting development server..."
	npm run tauri dev

# Build for current platform
build:
	@echo "🔨 Building for current platform..."
	npm run tauri build
	@echo "✅ Build complete! Check src-tauri/target/release/bundle/"

# Build for macOS (universal binary - Intel + Apple Silicon)
build-macos:
	@echo "🍎 Building for macOS..."
	@echo "Adding macOS targets..."
	rustup target add x86_64-apple-darwin aarch64-apple-darwin 2>/dev/null || true
	@echo "Building universal binary..."
	npm run tauri build -- --target universal-apple-darwin
	@echo "✅ macOS build complete!"
	@echo "📁 Output: src-tauri/target/universal-apple-darwin/release/bundle/"
	@ls -la src-tauri/target/universal-apple-darwin/release/bundle/dmg/ 2>/dev/null || true
	@ls -la src-tauri/target/universal-apple-darwin/release/bundle/macos/ 2>/dev/null || true

# Build for macOS Intel only
build-macos-intel:
	@echo "🍎 Building for macOS (Intel x64)..."
	rustup target add x86_64-apple-darwin 2>/dev/null || true
	npm run tauri build -- --target x86_64-apple-darwin
	@echo "✅ macOS Intel build complete!"
	@echo "📁 Output: src-tauri/target/x86_64-apple-darwin/release/bundle/"

# Build for macOS Apple Silicon only
build-macos-arm:
	@echo "🍎 Building for macOS (Apple Silicon)..."
	rustup target add aarch64-apple-darwin 2>/dev/null || true
	npm run tauri build -- --target aarch64-apple-darwin
	@echo "✅ macOS ARM build complete!"
	@echo "📁 Output: src-tauri/target/aarch64-apple-darwin/release/bundle/"

# Build for Windows (cross-compile from macOS/Linux)
# Requires: brew install mingw-w64 (macOS) or apt install mingw-w64 (Linux)
build-windows:
	@echo "🪟 Building for Windows..."
	@echo "⚠️  Note: Cross-compiling to Windows requires mingw-w64 toolchain"
	@echo "   macOS: brew install mingw-w64"
	@echo "   Linux: apt install mingw-w64"
	@echo ""
	rustup target add x86_64-pc-windows-msvc 2>/dev/null || true
	@echo "Building Windows executable..."
	npm run tauri build -- --target x86_64-pc-windows-msvc
	@echo "✅ Windows build complete!"
	@echo "📁 Output: src-tauri/target/x86_64-pc-windows-msvc/release/bundle/"

# Build for Windows using GNU toolchain (easier cross-compile)
build-windows-gnu:
	@echo "🪟 Building for Windows (GNU toolchain)..."
	rustup target add x86_64-pc-windows-gnu 2>/dev/null || true
	npm run tauri build -- --target x86_64-pc-windows-gnu
	@echo "✅ Windows GNU build complete!"

# Run all checks
check: lint
	@echo "🔍 Running TypeScript check..."
	npx tsc --noEmit
	@echo "🦀 Running Cargo check..."
	cd src-tauri && cargo check
	@echo "✅ All checks passed"

# Run ESLint
lint:
	@echo "🔍 Running ESLint..."
	npm run lint

# Fix ESLint issues
lint-fix:
	@echo "🔧 Fixing ESLint issues..."
	npm run lint:fix

# Format code
format:
	@echo "💅 Formatting code..."
	npm run format
	cd src-tauri && cargo fmt
	@echo "✅ Code formatted"

# Check formatting
format-check:
	@echo "🔍 Checking code formatting..."
	npm run format:check
	cd src-tauri && cargo fmt --check

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist
	rm -rf src-tauri/target
	rm -rf node_modules/.vite
	@echo "✅ Clean complete"

# Clean and rebuild
rebuild: clean install build
	@echo "✅ Rebuild complete"

# Build all platforms (run on macOS for best compatibility)
build-all: build-macos build-windows
	@echo "✅ All platform builds complete!"
	@echo ""
	@echo "Build outputs:"
	@echo "  macOS: src-tauri/target/universal-apple-darwin/release/bundle/"
	@echo "  Windows: src-tauri/target/x86_64-pc-windows-msvc/release/bundle/"

# Release build with optimizations
release:
	@echo "🚀 Building release version..."
	CARGO_PROFILE_RELEASE_LTO=true npm run tauri build
	@echo "✅ Release build complete"

# Show build info
info:
	@echo "Build Information"
	@echo "================"
	@echo "Node version: $$(node --version)"
	@echo "npm version: $$(npm --version)"
	@echo "Rust version: $$(rustc --version)"
	@echo "Cargo version: $$(cargo --version)"
	@echo "Tauri CLI version: $$(npm run tauri -- --version 2>/dev/null | tail -1)"
	@echo ""
	@echo "Installed targets:"
	@rustup target list --installed
