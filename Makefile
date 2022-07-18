# .PHONYk
build:
	docker build . --tag 'harlan:local'

run:
	docker run --name 'harlan' -p '8080:80' harlan:local
