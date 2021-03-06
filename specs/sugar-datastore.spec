%define version @version@
%define release_number @release_number@
%define release_date @release_date@
%define shortcommit @shortcommit@

%{!?python_sitelib: %global python_sitelib %(%{__python} -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())")}

Name: sugar-datastore
Version: %{version}
Release: %{release_number}.%{release_date}git%{shortcommit}%{?dist}
Summary: Sugar Datastore

Group: Development/Libraries
License: GPLv2+
URL: http://sugarlabs.org/
Source0: https://api.github.com/repos/sugarlabs/%{name}/tarball/%{shortcommit}

BuildRequires: python-devel
BuildRequires: autoconf
BuildRequires: automake
BuildRequires: libtool
Requires: xapian-bindings-python

%description
sugar-datastore is a simple log like datastore able to connect with multiple
backends. The datastore supports connectionig and disconnecting from
backends on the fly to help the support the limit space/memory
characteristics of the OLPC system and the fact that network services
may become unavailable at times

%prep
%setup -n sugarlabs-%{name}-%{shortcommit}

%build
./autogen.sh --prefix=%{_prefix}
make %{?_smp_mflags} V=1

%install
make install DESTDIR=%{buildroot} INSTALL='install -p'

#Remove libtool archives.
find %{buildroot} -name '*.la' -exec rm -f {} ';'

%files
%defattr(-,root,root,-)
%doc AUTHORS COPYING NEWS README
%{python_sitelib}/*
%{_bindir}/*
%{_datadir}/dbus-1/services/*.service
