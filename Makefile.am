DISTCHECK_CONFIGURE_FLAGS = --disable-dogtail

SUBDIRS = po data src tests

MAINTAINERCLEANFILES = \
	$(srcdir)/INSTALL \
	$(srcdir)/aclocal.m4 \
	$(srcdir)/autoscan.log \
	$(srcdir)/compile \
	$(srcdir)/config.guess \
	$(srcdir)/config.h.in \
	$(srcdir)/config.sub \
	$(srcdir)/configure.scan \
	$(srcdir)/depcomp \
	$(srcdir)/install-sh \
	$(srcdir)/ltmain.sh \
	$(srcdir)/missing \
	$(srcdir)/mkinstalldirs

GITIGNOREFILES = \
	m4/intltool.m4 \
	m4/libtool.m4 \
	m4/lt* \
	.build \
	.flatpak-builder \
	.buildconfig

distdir = $(PACKAGE_TARNAME)-$(VERSION)

-include $(top_srcdir)/git.mk
