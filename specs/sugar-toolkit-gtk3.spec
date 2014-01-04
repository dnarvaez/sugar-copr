%define version @version@
%define release_number @release_number@
%define release_date @release_date@
%define shortcommit @shortcommit@

%{!?python_sitelib: %global python_sitelib %(%{__python} -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())")}

Summary: Sugar toolkit GTK+ 3
Name:    sugar-toolkit-gtk3
Version: %{version}
Release: %{release_number}.%{release_date}git%{shortcommit}%{?dist}
URL:     http://wiki.laptop.org/go/Sugar
Source0: https://api.github.com/repos/sugarlabs/%{name}/tarball/%{shortcommit}
License: LGPLv2+
Group:   System Environment/Libraries

BuildRequires: alsa-lib-devel
BuildRequires: gettext-devel
BuildRequires: GConf2-devel
BuildRequires: gtk3-devel
BuildRequires: gobject-introspection-devel
BuildRequires: intltool
BuildRequires: librsvg2-devel
BuildRequires: libSM-devel
BuildRequires: perl-XML-Parser
BuildRequires: pkgconfig
BuildRequires: python-devel
BuildRequires: pygtk2-codegen
BuildRequires: pygobject2-devel
BuildRequires: autoconf
BuildRequires: automake
BuildRequires: libtool

Requires: dbus-python
Requires: gettext
Requires: pygobject3
Requires: python-dateutil
Requires: sugar-datastore
Requires: unzip
Requires: libwebkit2gtk

%description
Sugar is the core of the OLPC Human Interface. The toolkit provides
a set of widgets to build HIG compliant applications and interfaces
to interact with system services like presence and the datastore.
This is the toolkit depending on GTK3.

%package devel
Summary: Invokation information for accessing SugarExt-1.0
Group: Development/Libraries
Requires: %{name} = %{version}-%{release}

%description devel
This package contains the invocation information for accessing
the SugarExt-1.0 library through gobject-introspection.

%prep
%setup -n sugarlabs-%{name}-%{shortcommit}

%build
./autogen.sh --prefix=%{_prefix} --libdir=%{_libdir}
make %{?_smp_mflags} V=1

%install
make install DESTDIR=%{buildroot}

mkdir -p %{buildroot}/%{_sysconfdir}/rpm/

%find_lang %name

#Remove libtool archives.
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%post -p /sbin/ldconfig

%postun -p /sbin/ldconfig

%files -f %{name}.lang
%defattr(-,root,root,-)
%doc COPYING README
%{python_sitelib}/*
%{_bindir}/sugar-activity-web
%{_libdir}/girepository-1.0/*.typelib
%{_libdir}/lib*.so.*
%{_bindir}/sugar-activity

%files devel
%defattr(-,root,root,-)
%{_libdir}/*.so
%{_datadir}/gir-1.0/*.gir
