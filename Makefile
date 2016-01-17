scss ?= public/scss/main.scss
css ?= public/css/main.css

watch:
	bundle exec sass --watch $(scss):$(css)

clean:
	rm -f $(css)
