NULL =

nodist_bin_SCRIPTS = gnome-weather

jsdir = $(pkgdatadir)
dist_js_DATA = \
	city.js		\
	forecast.js	\
	main.js		\
	package.js	\
	params.js	\
	strings.js	\
	util.js		\
	window.js	\
	world.js	\
	$(NULL)

gnome-weather: gnome-weather.in
	$(AM_V_GEN) sed \
		-e "s|[@]GJS@|$(GJS)|g" \
		-e "s|[@]PACKAGE_NAME@|$(PACKAGE_NAME)|g" \
		-e "s|[@]PACKAGE_VERSION@|$(PACKAGE_VERSION)|g" \
		-e "s|[@]prefix@|$(prefix)|g" \
		-e "s|[@]libdir@|$(libdir)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		$< > $@
	@chmod +x $@

EXTRA_DIST = gnome-weather.in
DISTCLEANFILES = gnome-weather

-include $(top_srcdir)/git.mk
