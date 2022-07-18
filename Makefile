.PHONY: build
build:
	docker build . --tag 'harlan:local'

.PHONY: run
run:
	docker run --name 'harlan' -p '8080:80' harlan:local
