# NokiaPulse packaging: manifest.json is at the ZIP root.
# Without Make on Windows: node scripts/pack-extension.mjs

.PHONY: help pack check list test icons hooks clean

EXTENSION := extension
DIST := dist
VERSION := $(shell node -p "JSON.parse(require('fs').readFileSync('$(EXTENSION)/manifest.json','utf8')).version")

help:
	@echo "NokiaPulse packaging"
	@echo ""
	@echo "  make pack   - Create dist/NokiaPulse-$(VERSION).zip from allowlisted files"
	@echo "  make check  - Validate files and local-only scripts without creating a ZIP"
	@echo "  make list   - List packaged files"
	@echo "  make test   - Run unit tests with node:test"
	@echo "  make icons  - Regenerate extension/icons/*.png"
	@echo "  make hooks  - Install repository hooks and author settings"
	@echo "  make clean  - Remove dist/*.zip"
	@echo ""
	@echo "Local testing: enable developer mode at edge://extensions and load $(EXTENSION)/"

pack:
	node scripts/pack-extension.mjs

check:
	node scripts/pack-extension.mjs --check-only

list:
	node scripts/pack-extension.mjs --list-only

test:
	node --test "tests/*.test.mjs"

icons:
	node scripts/generate-icons.mjs

hooks:
	node scripts/install-git-hooks.mjs

clean:
	@if [ -d "$(DIST)" ]; then rm -f "$(DIST)"/*.zip; echo "Removed $(DIST)/*.zip"; fi
