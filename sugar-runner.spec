%define version 0.101.0
%define release_number 1
%define release_date 20140104
%define shortcommit 6202234

Name:          sugar-runner
Version:       %{version}
Release:       %{release_number}.%{release_date}git%{shortcommit}%{?dist}
Summary:       Sugar runner emulator for development
Group:         User Interface/Desktops
License:       GPLv2+
URL:           http://sugarlabs.org/
Source0:       https://api.github.com/repos/sugarlabs/%{name}/tarball/%{shortcommit}

BuildRequires: desktop-file-utils
BuildRequires: glib2-devel
BuildRequires: gobject-introspection-devel
BuildRequires: libX11-devel
BuildRequires: libXrandr-devel
Requires: sugar
Requires: xorg-x11-server-Xephyr

Provides: sugar-emulator
Obsoletes: sugar-emulator

%description
sugar-runner allows to run sugar without using a display manager as usually
required by X desktops. You can run it either from a text console
or from inside another X session. By default it runs fullscreen but when inside
X you can specify the window size using the --resolution option.

%package devel
Summary: Development package for %{name}
Group: Development/Libraries
Requires: %{name}%{?_isa} = %{version}-%{release}

%description devel
Files for development with %{name}.

%prep
%setup -n sugarlabs-%{name}-%{shortcommit}

%build
./autogen.sh --prefix=%{_prefix} --libdir=%{_libdir}
make %{?_smp_mflags} V=1

%install
make install DESTDIR=%{buildroot} INSTALL='install -p'

#Remove libtool archives.
find %{buildroot} -name '*.la' -exec rm -f {} ';'

desktop-file-validate %{buildroot}/%{_datadir}/applications/%{name}.desktop

%post
/sbin/ldconfig
/bin/touch --no-create %{_datadir}/icons/hicolor &>/dev/null || :

%postun
/sbin/ldconfig
if [ $1 -eq 0 ] ; then
    /bin/touch --no-create %{_datadir}/icons/hicolor &>/dev/null
    /usr/bin/gtk-update-icon-cache %{_datadir}/icons/hicolor &>/dev/null || :
fi

%posttrans
/usr/bin/gtk-update-icon-cache %{_datadir}/icons/hicolor &>/dev/null || :

%files
%doc COPYING
%{_bindir}/sugar-runner
%{_libexecdir}/sugar-runner
%{_libdir}/girepository-1.0/SugarRunner-1.0.typelib
%{_libdir}/libsugarrunner.so.*
%{_datadir}/applications/sugar-runner.desktop
%{_datadir}/icons/hicolor/scalable/apps/sugar-xo.svg

%files devel
%{_libdir}/*.so
%{_datadir}/gir-1.0/SugarRunner-1.0.gir
