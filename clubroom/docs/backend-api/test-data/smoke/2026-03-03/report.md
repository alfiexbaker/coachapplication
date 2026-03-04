# UI Flow Check Report (50+)

- Base URL: http://localhost:8083
- Generated: 2026-03-03T18:41:52.330Z
- Total flows: 34
- Failed: 0
- High: 0
- Medium: 2
- Roles: coach, parent, athlete
- Profiles: coach-core, parent-core, athlete-core
- Retries: 2

## High / Medium Findings

- [MEDIUM] parent_home (/) :: console:In HTML, %s cannot be a descendant of <%s>.
This will cause a hydration error.%s <button> button 

  ...
    <RootNavigation>
      <ThemeProvider value={{dark:true, ...}}>
        <ToastProvider>
          <NotificationToastProvider>
            <NativeStackNavigator>
            <OfflineBanner>
            <StatusBar>
            <View style={[...]}>
              <AnimatedComponent(View) style={[...]} ref={null} forwardedRef={undefined}>
                <View nativeID="10" style={[...]} forwardedRef={undefined} ref={function _setComponentRef}>
                  <div dir={null} ref={function forwardRef} className="css-view-g..." style={{position:"...", ...}} ...>
                    <Clickable onPress={function}>
                      <Pressable ref={null} onPress={function} onLongPress={undefined} onPressIn={undefined} ...>
                        <View hitSlop={8} accessibilityLabel={undefined} accessibilityHint={undefined} ...>
>                         <button
>                           onKeyDown={function}
>                           onClick={function onClick}
>                           onContextMenu={function}
>                           onBlur={function}
>                           onFocus={function}
>                           dir={null}
>                           ref={function forwardRef}
>                           role="button"
>                           tabIndex={0}
>                           className="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73"
>                           type="button"
>                         >
                            ...
                              <Pressable ref={null} onPress={function} onLongPress={undefined} onPressIn={undefined} ...>
                                <View hitSlop={8} accessibilityLabel={undefined} accessibilityHint={undefined} ...>
>                                 <button
>                                   onKeyDown={function}
>                                   onClick={function onClick}
>                                   onContextMenu={function}
>                                   onBlur={function}
>                                   onFocus={function}
>                                   dir={null}
>                                   ref={function forwardRef}
>                                   role="button"
>                                   tabIndex={0}
>                                   className="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73"
>                                   type="button"
>                                 >
          ...
 | console:<%s> cannot contain a nested %s.
See this log for the ancestor stack trace. button <button>
- [MEDIUM] athlete_home (/) :: console:In HTML, %s cannot be a descendant of <%s>.
This will cause a hydration error.%s <button> button 

  ...
    <RootNavigation>
      <ThemeProvider value={{dark:true, ...}}>
        <ToastProvider>
          <NotificationToastProvider>
            <NativeStackNavigator>
            <OfflineBanner>
            <StatusBar>
            <View style={[...]}>
              <AnimatedComponent(View) style={[...]} ref={null} forwardedRef={undefined}>
                <View nativeID="6" style={[...]} forwardedRef={undefined} ref={function _setComponentRef}>
                  <div dir={null} ref={function forwardRef} className="css-view-g..." style={{position:"...", ...}} ...>
                    <Clickable onPress={function}>
                      <Pressable ref={null} onPress={function} onLongPress={undefined} onPressIn={undefined} ...>
                        <View hitSlop={8} accessibilityLabel={undefined} accessibilityHint={undefined} ...>
>                         <button
>                           onKeyDown={function}
>                           onClick={function onClick}
>                           onContextMenu={function}
>                           onBlur={function}
>                           onFocus={function}
>                           dir={null}
>                           ref={function forwardRef}
>                           role="button"
>                           tabIndex={0}
>                           className="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73"
>                           type="button"
>                         >
                            ...
                              <Pressable ref={null} onPress={function} onLongPress={undefined} onPressIn={undefined} ...>
                                <View hitSlop={8} accessibilityLabel={undefined} accessibilityHint={undefined} ...>
>                                 <button
>                                   onKeyDown={function}
>                                   onClick={function onClick}
>                                   onContextMenu={function}
>                                   onBlur={function}
>                                   onFocus={function}
>                                   dir={null}
>                                   ref={function forwardRef}
>                                   role="button"
>                                   tabIndex={0}
>                                   className="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73"
>                                   type="button"
>                                 >
          ...
 | console:<%s> cannot contain a nested %s.
See this log for the ancestor stack trace. button <button>
