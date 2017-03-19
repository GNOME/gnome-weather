# I chose to use recursive automake so I can use nobase_ and avoid
# 5 different directory declarations
SUBDIRS = icons

app_resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir) --generate-dependencies $(srcdir)/$(PACKAGE_NAME).Application.data.gresource.xml)
$(PACKAGE_NAME).Application.data.gresource: $(PACKAGE_NAME).Application.data.gresource.xml $(app_resource_files)
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir) $<
service_resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir) --generate-dependencies $(srcdir)/$(PACKAGE_NAME).BackgroundService.data.gresource.xml)
$(PACKAGE_NAME).BackgroundService.data.gresource: $(PACKAGE_NAME).BackgroundService.data.gresource.xml $(service_resource_files)
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir) $<

resourcedir = $(pkgdatadir)
resource_DATA = $(PACKAGE_NAME).Application.data.gresource $(PACKAGE_NAME).BackgroundService.data.gresource

appsdir = $(datadir)/applications
apps_DATA = $(PACKAGE_NAME).Application.desktop

@INTLTOOL_DESKTOP_RULE@

gsettings_SCHEMAS = $(PACKAGE_NAME).Application.gschema.xml

@GSETTINGS_RULES@

appstream_XML = $(PACKAGE_NAME).appdata.xml

@APPSTREAM_XML_RULES@
@INTLTOOL_XML_RULE@

$(PACKAGE_NAME).Application.service: $(PACKAGE_NAME).Application.service.in
	$(AM_V_GEN) sed \
		-e "s|[@]PACKAGE_NAME@|$(PACKAGE_NAME)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		-e "s|[@]pkglibdir@|$(pkglibdir)|g" \
		$< > $@

$(PACKAGE_NAME).BackgroundService.service: $(PACKAGE_NAME).BackgroundService.service.in
	$(AM_V_GEN) sed \
		-e "s|[@]PACKAGE_NAME@|$(PACKAGE_NAME)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		-e "s|[@]pkglibdir@|$(pkglibdir)|g" \
		$< > $@

servicedir = $(datadir)/dbus-1/services
service_DATA = $(PACKAGE_NAME).Application.service $(PACKAGE_NAME).BackgroundService.service

searchproviderdir = $(datadir)/gnome-shell/search-providers
dist_searchprovider_DATA = $(PACKAGE_NAME).Application.search-provider.ini

EXTRA_DIST = \
	CREDITS \
	$(PACKAGE_NAME).Application.desktop.in \
	$(PACKAGE_NAME).Application.service.in \
	$(PACKAGE_NAME).BackgroundService.service.in \
	$(PACKAGE_NAME).Application.data.gresource.xml \
	$(PACKAGE_NAME).BackgroundService.data.gresource.xml \
	$(gsettings_SCHEMAS) \
	$(PACKAGE_NAME).appdata.xml.in \
	$(app_resource_files) \
	$(service_resource_files) \
	$(NULL)

CLEANFILES = \
	$(PACKAGE_NAME).Application.service \
	$(PACKAGE_NAME).BackgroundService.service \
	$(PACKAGE_NAME).Application.data.gresource \
	$(PACKAGE_NAME).BackgroundService.data.gresource \
	$(PACKAGE_NAME).appdata.xml \
	$(PACKAGE_NAME).appdata.valid \
	$(apps_DATA) \
	*.valid \
	gschemas.compiled \
	$(NULL)

# For uninstalled use
all-local:
	$(GLIB_COMPILE_SCHEMAS) --targetdir=$(builddir) $(srcdir)

-include $(top_srcdir)/git.mk
