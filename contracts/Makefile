TARGET := riscv64imac-unknown-none-elf
MODE := release
BUILD_DIR := build/$(MODE)

ifeq ($(MODE),release)
  CARGO_FLAGS := --release
else
  CARGO_FLAGS :=
endif

# Find all contract crates
CONTRACTS := $(wildcard */Cargo.toml)
CONTRACT_NAMES := $(dir $(CONTRACTS))

.PHONY: all build clean test fmt check

all: build

build:
	@mkdir -p $(BUILD_DIR)
	cargo build --target $(TARGET) $(CARGO_FLAGS)
	@for bin in target/$(TARGET)/$(MODE)/*; do \
		if [ -f "$$bin" ] && [ -x "$$bin" ] || file "$$bin" 2>/dev/null | grep -q ELF; then \
			cp "$$bin" $(BUILD_DIR)/; \
			echo "Built: $(BUILD_DIR)/$$(basename $$bin)"; \
		fi; \
	done

clean:
	cargo clean
	rm -rf build/

test:
	cargo test

fmt:
	cargo fmt --all

check:
	cargo check --target $(TARGET)

# Build a specific contract: make build-contract CONTRACT=tictactoe-script
build-contract:
ifndef CONTRACT
	$(error CONTRACT is not set. Usage: make build-contract CONTRACT=tictactoe-script)
endif
	cargo build --target $(TARGET) $(CARGO_FLAGS) -p $(CONTRACT)
