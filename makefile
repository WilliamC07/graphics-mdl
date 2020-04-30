all:
	npm install --save-dev @types/node
	tsc
	node src/index.js script.txt

dev:
	node src/index.js script.txt

myscript:
	echo "myscript running"
	node myscript-generator.js
