Name:		%{_name}
Version:	%{_version}
Release:	1%{?dist}
Summary:	GNOME Weather

License:	GPLv2+ and LGPLv2+ and MIT and CC-BY and CC-BY-SA
URL:		http://wiki.gnome.org/Apps/Weather
Source0:        %{_distdir}-%{version}.tar.xz
BuildArch:      noarch

Provides:       org.gnome.Weather.Application = %{_version}
Obsoletes:      org.gnome.Weather.Application < 1.13.1

%description
A small application that allows you to monitor the current weather
conditions for your city, or anywhere in the world and to access
updated forecasts, up to 7 days, provided by various internet services.

%prep
%setup -q -n %{_distdir}-%{version}

%build
%configure --disable-static
make %{?_smp_mflags}

%install
make install DESTDIR=$RPM_BUILD_ROOT
rm -fR $RPM_BUILD_ROOT/%{_bindir}
rm -fR $RPM_BUILD_ROOT/%{_datadir}/org.gnome.Weather/gir-1.0
desktop-file-edit $RPM_BUILD_ROOT/%{_datadir}/applications/%{name}.Application.desktop \
    --set-key=X-AppInstall-Package --set-value=%{name}

%find_lang %{name}

%check
desktop-file-validate $RPM_BUILD_ROOT/%{_datadir}/applications/%{name}.Application.desktop

%post
touch --no-create %{_datadir}/icons/hicolor &>/dev/null || :

%postun
if [ $1 -eq 0 ] ; then
    glib-compile-schemas %{_datadir}/glib-2.0/schemas &> /dev/null || :
    touch --no-create %{_datadir}/icons/hicolor &>/dev/null
    gtk-update-icon-cache %{_datadir}/icons/hicolor &>/dev/null || :
fi

%posttrans
glib-compile-schemas %{_datadir}/glib-2.0/schemas &> /dev/null || :
gtk-update-icon-cache %{_datadir}/icons/hicolor &>/dev/null || :

%files -f %{name}.lang
%doc NEWS COPYING
%{_datadir}/appdata/%{name}.Application.appdata.xml
%{_datadir}/applications/%{name}.Application.desktop
%{_datadir}/dbus-1/services/%{name}.Application.service
%{_datadir}/glib-2.0/schemas/%{name}.Application.gschema.xml
%{_datadir}/gnome-shell/search-providers/%{name}.Application.search-provider.ini
%{_datadir}/icons/hicolor/*/apps/%{name}.Application.png
%{_datadir}/%{name}/
