@echo off
setlocal

set APP_HOME_DIR=%~dp0

set WRAPPER_JAR=%APP_HOME_DIR%gradle\wrapper\gradle-wrapper.jar
if exist "%WRAPPER_JAR%" goto :found
echo Error: gradle-wrapper.jar not found at %WRAPPER_JAR%
exit /b 1

:found

set JAVACMD=java
where java >nul 2>&1
if %ERRORLEVEL%==0 goto :run

set JAVA_HOME_BIN=%JAVA_HOME%\bin\java
if exist "%JAVA_HOME_BIN%" (
    set JAVACMD=%JAVA_HOME_BIN%
    goto :run
)

echo Error: java not found in PATH. Please install JDK or set JAVA_HOME.
exit /b 1

:run
"%JAVACMD%" -Dfile.encoding=UTF-8 -cp "%WRAPPER_JAR%" org.gradle.wrapper.GradleWrapperMain %*
