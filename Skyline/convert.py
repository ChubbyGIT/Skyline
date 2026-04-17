import re

with open('c:/Users/abhig/OneDrive/Desktop/Codes/Skyline/Stitch_home_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract styles
style_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
styles = style_match.group(1) if style_match else ''

# Extract body content
body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL)
body_content = body_match.group(1) if body_match else html

# Convert class to className
jsx = body_content.replace('class=', 'className=')
jsx = jsx.replace('for=', 'htmlFor=')

# Convert HTML comments to JSX comments
jsx = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', jsx)

# Convert self-closing tags
jsx = re.sub(r'<(img|path|input|hr|br|source)([^>]*[^/])>', r'<\1\2/>', jsx)
jsx = jsx.replace('<svg className="w-6 h-6" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">', '<svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">')
jsx = jsx.replace('<svg className="w-full h-full fill-gold animate-pulse-slow" viewbox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">', '<svg className="w-full h-full fill-gold animate-pulse-slow" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">')

jsx = jsx.replace('Continue with Google', 'Continue with Google')

# Ensure we attach onClick to the correct button
jsx = jsx.replace('<button className="liquid-glass', '<button onClick={handleLogin} className="liquid-glass')


# Fix style strings
def repl_style(m):
    style_str = m.group(1)
    props = []
    for pair in style_str.split(';'):
        pair = pair.strip()
        if not pair: continue
        parts = pair.split(':', 1)
        if len(parts) == 2:
            key, val = parts
            key = key.strip()
            val = val.strip()
            if key.startswith('--'):
                props.append(f"'{key}': '{val}'")
            else:
                # camelCase keys
                key_parts = key.split('-')
                camel_key = key_parts[0] + ''.join(x.capitalize() for x in key_parts[1:])
                props.append(f"{camel_key}: '{val}'")
    props_str = ', '.join(props)
    if '--' in style_str:
        return f"style={{{{ {props_str} }} as React.CSSProperties}}"
    else:
        return f"style={{{{ {props_str} }}}}"

jsx = re.sub(r'style="(.*?)"', repl_style, jsx)

# Write to page.tsx
with open('c:/Users/abhig/OneDrive/Desktop/Codes/Skyline/frontend/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write('''"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
    const router = useRouter();

    const handleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/city`
            }
        });
        if (error) console.error("Login Error: ", error.message);
    };

    useEffect(() => {
        const checkUser = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                router.push("/city");
            }
        };
        checkUser();
        
        const {data: authListener} = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session) {
                    router.push("/city");
                }
            }
        );
        
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [router]);

    return (
        <div className="bg-surface font-body text-on-surface selection:bg-gold/30 overflow-x-hidden min-h-screen">
''' + jsx + '''
        </div>
    );
}
''')

# Write styles to a temporary file so I can inspect or append
with open('c:/Users/abhig/OneDrive/Desktop/Codes/Skyline/frontend/styletemp.css', 'w', encoding='utf-8') as f:
    f.write(styles)

