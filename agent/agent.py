import asyncio
import websockets
import json
import psutil
import platform
import subprocess
import socket
import time
import os
import shutil
from pathlib import Path
import base64
import io
import google.generativeai as genai
import re

# CONFIGURATION
SERVER_URL = "wss://omni-backend-603531145334.asia-south1.run.app/ws/agent"

# Try to load configuration
try:
    from config import GEMINI_API_KEY
except ImportError:
    GEMINI_API_KEY = "your-gemini-api-key-here"  # Default - replace with your actual API key
    print("⚠️  No config.py found. Using default API key. Please create config.py from config.example.py")

# Initialize Gemini AI
try:
    if GEMINI_API_KEY and GEMINI_API_KEY != "your-gemini-api-key-here":
        genai.configure(api_key=GEMINI_API_KEY)
        ai_model = genai.GenerativeModel('gemini-3-flash-preview')
        AI_ENABLED = True
        print("✅ Gemini AI initialized successfully")
    else:
        AI_ENABLED = False
        print("⚠️  AI features disabled: Please configure GEMINI_API_KEY in config.py")
except Exception as e:
    print(f"❌ AI initialization failed: {e}")
    AI_ENABLED = False

# Global state for persistent session
current_working_dir = os.getcwd()

def get_system_stats():
    """Enhanced system metrics."""
    try:
        # Basic stats
        cpu_percent = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # Network stats
        net_io = psutil.net_io_counters()
        
        # CPU temperature (if available)
        temps = {}
        try:
            temp_sensors = psutil.sensors_temperatures()
            for name, entries in temp_sensors.items():
                for entry in entries:
                    temps[f"{name}_{entry.label or 'temp'}"] = entry.current
        except:
            temps = {"cpu_temp": "N/A"}
        
        # Boot time
        boot_time = psutil.boot_time()
        
        # Process count
        process_count = len(psutil.pids())
        
        return {
            "cpu_percent": cpu_percent,
            "cpu_count": psutil.cpu_count(),
            "cpu_freq": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else {},
            "ram_percent": memory.percent,
            "ram_total": memory.total,
            "ram_used": memory.used,
            "ram_available": memory.available,
            "disk_percent": (disk.used / disk.total) * 100,
            "disk_total": disk.total,
            "disk_used": disk.used,
            "disk_free": disk.free,
            "network_sent": net_io.bytes_sent,
            "network_recv": net_io.bytes_recv,
            "network_io": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            },
            "process_count": process_count,
            "temperatures": temps,
            "boot_time": boot_time,
            "platform": platform.platform(),
            "hostname": socket.gethostname(),
            "uptime": time.time() - boot_time
        }
    except Exception as e:
        return {"error": str(e)}

def get_processes():
    """Get running processes."""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return {"processes": sorted(processes, key=lambda x: x['memory_percent'], reverse=True)[:50]}
    except Exception as e:
        return {"error": str(e)}

def get_directory_contents(path="."):
    """Get directory listing."""
    global current_working_dir
    try:
        if path == ".":
            path = current_working_dir
        
        path = Path(path).resolve()
        
        # Update current working directory if it's a valid directory
        if path.exists() and path.is_dir():
            current_working_dir = str(path)
        
        items = []
        
        # Add parent directory
        if path.parent != path:
            items.append({
                "name": "..",
                "type": "directory",
                "size": 0,
                "modified": "",
                "path": str(path.parent),
                "permissions": "drwxr-xr-x"
            })
        
        try:
            for item in sorted(path.iterdir()):
                try:
                    stat = item.stat()
                    
                    # Get permissions
                    perms = oct(stat.st_mode)[-3:]
                    perm_str = ""
                    if item.is_dir():
                        perm_str = "d"
                    else:
                        perm_str = "-"
                    
                    for i, perm in enumerate(perms):
                        p = int(perm)
                        perm_str += "r" if p & 4 else "-"
                        perm_str += "w" if p & 2 else "-"
                        perm_str += "x" if p & 1 else "-"
                    
                    items.append({
                        "name": item.name,
                        "type": "directory" if item.is_dir() else "file",
                        "size": stat.st_size if item.is_file() else 0,
                        "modified": time.ctime(stat.st_mtime),
                        "path": str(item),
                        "permissions": perm_str
                    })
                except (PermissionError, OSError) as e:
                    items.append({
                        "name": item.name,
                        "type": "directory" if item.is_dir() else "file", 
                        "size": 0,
                        "modified": "Permission Denied",
                        "path": str(item),
                        "permissions": "?????????",
                        "error": str(e)
                    })
        except PermissionError:
            return {
                "current_path": str(path),
                "items": [],
                "error": "Permission denied to read directory"
            }
                
        return {
            "current_path": str(path),
            "items": items
        }
    except Exception as e:
        return {"error": str(e), "current_path": current_working_dir}

def kill_process(pid):
    """Kill a process by PID."""
    try:
        proc = psutil.Process(int(pid))
        proc.terminate()
        return {"success": f"Process {pid} terminated"}
    except Exception as e:
        return {"error": str(e)}

def read_file_content(file_path, max_size=1024*1024):
    """Read file content for viewing."""
    try:
        path = Path(file_path)
        
        if not path.exists():
            return {"error": "File not found"}
        
        if not path.is_file():
            return {"error": "Not a file"}
        
        file_size = path.stat().st_size
        
        if file_size > max_size:
            return {"error": f"File too large ({file_size} bytes). Max: {max_size} bytes"}
        
        # Determine file type
        file_ext = path.suffix.lower()
        
        # Text files
        text_extensions = {'.txt', '.log', '.py', '.js', '.html', '.css', '.json', '.xml', '.md', '.csv', '.ini', '.cfg', '.conf', '.sh', '.bat', '.ps1'}
        
        if file_ext in text_extensions:
            try:
                content = path.read_text(encoding='utf-8', errors='replace')
                return {
                    "type": "text",
                    "content": content,
                    "size": file_size,
                    "encoding": "utf-8",
                    "extension": file_ext
                }
            except Exception as e:
                return {"error": f"Could not read text file: {str(e)}"}
        
        # Image files
        image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'}
        if file_ext in image_extensions:
            try:
                import base64
                content = base64.b64encode(path.read_bytes()).decode('utf-8')
                return {
                    "type": "image",
                    "content": content,
                    "size": file_size,
                    "extension": file_ext,
                    "mime_type": f"image/{file_ext[1:]}"
                }
            except Exception as e:
                return {"error": f"Could not read image file: {str(e)}"}
        
        # Binary files - just return info
        return {
            "type": "binary",
            "size": file_size,
            "extension": file_ext,
            "info": "Binary file - use 'Open with system' to view"
        }
        
    except Exception as e:
        return {"error": str(e)}

def open_file_with_system(file_path):
    """Open file with system default application."""
    try:
        path = Path(file_path)
        if not path.exists():
            return {"error": "File not found"}
        
        import subprocess
        import sys
        
        if sys.platform == "win32":
            os.startfile(str(path))
        elif sys.platform == "darwin":  # macOS
            subprocess.run(["open", str(path)])
        else:  # Linux
            subprocess.run(["xdg-open", str(path)])
        
        return {"success": f"Opened {path.name} with system default application"}
        
    except Exception as e:
        return {"error": str(e)}

def download_file(file_path, chunk_size=8192):
    """Prepare file for download by encoding in base64 chunks."""
    try:
        path = Path(file_path)
        if not path.exists() or not path.is_file():
            return {"error": "File not found or is not a file"}
        
        file_size = path.stat().st_size
        if file_size > 10*1024*1024:  # 10MB limit
            return {"error": "File too large for download (max 10MB)"}
        
        import base64
        content = base64.b64encode(path.read_bytes()).decode('utf-8')
        
        return {
            "content": content,
            "filename": path.name,
            "size": file_size,
            "mime_type": "application/octet-stream"
        }
        
    except Exception as e:
        return {"error": str(e)}

def search_files(search_query, search_path=".", max_results=50):
    """Search for files and directories matching the query."""
    global current_working_dir
    try:
        if search_path == ".":
            search_path = current_working_dir
        
        search_path = Path(search_path)
        results = []
        search_query = search_query.lower()
        
        def search_recursive(path, depth=0):
            if depth > 3:  # Limit recursion depth
                return
            
            try:
                for item in path.iterdir():
                    if len(results) >= max_results:
                        return
                    
                    try:
                        if search_query in item.name.lower():
                            stat = item.stat()
                            results.append({
                                "name": item.name,
                                "type": "directory" if item.is_dir() else "file",
                                "size": stat.st_size if item.is_file() else 0,
                                "modified": time.ctime(stat.st_mtime),
                                "path": str(item),
                                "parent": str(item.parent)
                            })
                        
                        # Search in subdirectories
                        if item.is_dir():
                            search_recursive(item, depth + 1)
                    except (PermissionError, OSError):
                        continue
            except (PermissionError, OSError):
                pass
        
        search_recursive(search_path)
        
        return {
            "results": results,
            "query": search_query,
            "search_path": str(search_path)
        }
        
    except Exception as e:
        return {"error": str(e)}

def create_file(file_path, content=""):
    """Create a new file."""
    try:
        path = Path(file_path)
        if path.exists():
            return {"error": "File already exists"}
        
        path.write_text(content, encoding='utf-8')
        return {"success": f"File {path.name} created successfully"}
    except Exception as e:
        return {"error": str(e)}

def create_directory(dir_path):
    """Create a new directory."""
    try:
        path = Path(dir_path)
        if path.exists():
            return {"error": "Directory already exists"}
        
        path.mkdir(parents=True)
        return {"success": f"Directory {path.name} created successfully"}
    except Exception as e:
        return {"error": str(e)}

def delete_file_or_directory(path_str):
    """Delete a file or directory."""
    try:
        path = Path(path_str)
        if not path.exists():
            return {"error": "Path does not exist"}
        
        if path.is_file():
            path.unlink()
            return {"success": f"File {path.name} deleted successfully"}
        elif path.is_dir():
            shutil.rmtree(path)
            return {"success": f"Directory {path.name} deleted successfully"}
    except Exception as e:
        return {"error": str(e)}

def rename_file_or_directory(old_path, new_name):
    """Rename a file or directory."""
    try:
        old_path = Path(old_path)
        if not old_path.exists():
            return {"error": "Path does not exist"}
        
        new_path = old_path.parent / new_name
        if new_path.exists():
            return {"error": "Target name already exists"}
        
        old_path.rename(new_path)
        return {"success": f"Renamed to {new_name} successfully"}
    except Exception as e:
        return {"error": str(e)}

def copy_file_or_directory(source_path, dest_path):
    """Copy a file or directory."""
    try:
        source = Path(source_path)
        dest = Path(dest_path)
        
        if not source.exists():
            return {"error": "Source does not exist"}
        
        if dest.exists():
            return {"error": "Destination already exists"}
        
        if source.is_file():
            shutil.copy2(source, dest)
            return {"success": f"File copied successfully"}
        elif source.is_dir():
            shutil.copytree(source, dest)
            return {"success": f"Directory copied successfully"}
    except Exception as e:
        return {"error": str(e)}

def upload_file(file_path, content_base64):
    """Upload a file with base64 content."""
    try:
        import base64
        path = Path(file_path)
        
        if path.exists():
            return {"error": "File already exists"}
        
        content = base64.b64decode(content_base64)
        path.write_bytes(content)
        
        return {"success": f"File {path.name} uploaded successfully", "size": len(content)}
    except Exception as e:
        return {"error": str(e)}

def get_disk_usage(path_str="."):
    """Get disk usage for a specific path."""
    global current_working_dir
    try:
        if path_str == ".":
            path_str = current_working_dir
        
        path = Path(path_str)
        
        if path.is_file():
            return {"size": path.stat().st_size}
        elif path.is_dir():
            total_size = 0
            file_count = 0
            dir_count = 0
            
            for item in path.rglob('*'):
                try:
                    if item.is_file():
                        total_size += item.stat().st_size
                        file_count += 1
                    elif item.is_dir():
                        dir_count += 1
                except (PermissionError, OSError):
                    continue
            
            return {
                "total_size": total_size,
                "file_count": file_count,
                "directory_count": dir_count
            }
    except Exception as e:
        return {"error": str(e)}

# ============ REMOTE DESKTOP & MEDIA FEATURES ============

def take_screenshot(quality='medium'):
    """Capture screenshot of the screen with quality options."""
    import subprocess  # Import subprocess at the top
    try:
        # Quality settings - affects compression and size
        quality_settings = {
            'low': {'format': 'JPEG', 'quality': 60, 'scale': 0.7},
            'medium': {'format': 'PNG', 'quality': 80, 'scale': 0.85}, 
            'high': {'format': 'PNG', 'quality': 95, 'scale': 1.0}
        }
        
        settings = quality_settings.get(quality, quality_settings['medium'])
        
        if platform.system() == "Windows":
            # Windows screenshot using PIL and win32
            try:
                from PIL import ImageGrab, Image
                screenshot = ImageGrab.grab()
                
                # Scale image based on quality setting
                if settings['scale'] != 1.0:
                    new_size = (int(screenshot.width * settings['scale']), 
                                int(screenshot.height * settings['scale']))
                    screenshot = screenshot.resize(new_size, Image.Resampling.LANCZOS)
                
                buffer = io.BytesIO()
                save_kwargs = {'format': settings['format']}
                if settings['format'] == 'JPEG':
                    save_kwargs['quality'] = settings['quality']
                    save_kwargs['optimize'] = True
                    
                screenshot.save(buffer, **save_kwargs)
                img_base64 = base64.b64encode(buffer.getvalue()).decode()
                
                return {
                    "image": img_base64,
                    "width": screenshot.width,
                    "height": screenshot.height,
                    "format": settings['format'],
                    "quality": quality
                }
            except ImportError:
                # Fallback method
                subprocess.run(['powershell', '-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{PRTSC}")'], timeout=5)
                return {"success": "Screenshot taken to clipboard"}
        else:
            # Linux screenshot with multiple fallbacks
            temp_file = f'/tmp/screenshot_{quality}.png'
            screenshot_commands = [
                ['gnome-screenshot', '-f', temp_file],
                ['scrot', temp_file],
                ['import', '-window', 'root', temp_file],  # ImageMagick
                ['maim', temp_file],
                ['xwd', '-root', '-out', temp_file.replace('.png', '.xwd')]  # X11 fallback
            ]
            
            image_data = None
            for cmd in screenshot_commands:
                try:
                    # Check if command exists before trying
                    if subprocess.run(['which', cmd[0]], capture_output=True).returncode != 0:
                        continue
                        
                    result = subprocess.run(cmd, capture_output=True, timeout=10)
                    if result.returncode == 0:
                        # Handle xwd format conversion if needed
                        if cmd[0] == 'xwd':
                            xwd_file = temp_file.replace('.png', '.xwd')
                            # Convert xwd to png using ImageMagick
                            convert_result = subprocess.run(['convert', xwd_file, temp_file], capture_output=True, timeout=10)
                            if convert_result.returncode == 0:
                                os.remove(xwd_file)  # Clean up xwd file
                            else:
                                continue
                        
                        if os.path.exists(temp_file):
                            with open(temp_file, 'rb') as f:
                                image_data = f.read()
                            os.remove(temp_file)
                            break
                except Exception as e:
                    print(f"Screenshot command {cmd[0]} failed: {e}")
                    continue
            
            if image_data:
                # Process image with quality adjustment if needed
                if quality != 'high':
                    try:
                        from PIL import Image
                        img = Image.open(io.BytesIO(image_data))
                        
                        # Scale and compress based on quality
                        if settings['scale'] != 1.0:
                            new_size = (int(img.width * settings['scale']), 
                                       int(img.height * settings['scale']))
                            img = img.resize(new_size, Image.Resampling.LANCZOS)
                        
                        buffer = io.BytesIO()
                        save_kwargs = {'format': settings['format']}
                        if settings['format'] == 'JPEG':
                            save_kwargs['quality'] = settings['quality']
                            save_kwargs['optimize'] = True
                            
                        img.save(buffer, **save_kwargs)
                        image_data = buffer.getvalue()
                        
                        return {
                            "image": base64.b64encode(image_data).decode(),
                            "width": img.width,
                            "height": img.height,
                            "format": settings['format'],
                            "quality": quality
                        }
                    except ImportError:
                        # PIL not available, return original
                        pass
                
                return {
                    "image": base64.b64encode(image_data).decode(),
                    "format": "PNG",
                    "quality": quality
                }
            else:
                return {"error": "No screenshot tools available. Please install one of: gnome-screenshot, scrot, imagemagick, maim"}
    except Exception as e:
        return {"error": str(e)}

# Global state for live preview
live_preview_active = False
live_preview_interval = 1
live_preview_websocket = None

def start_live_preview(quality='medium', interval=1):
    """Start live preview streaming."""
    global live_preview_active, live_preview_interval
    try:
        live_preview_active = True
        live_preview_interval = interval
        
        return {"success": "Live preview started", "quality": quality, "interval": interval}
    except Exception as e:
        return {"error": str(e)}

def stop_live_preview():
    """Stop live preview streaming."""
    global live_preview_active
    try:
        live_preview_active = False
        return {"success": "Live preview stopped"}
    except Exception as e:
        return {"error": str(e)}

def get_live_frame(quality='medium'):
    """Get a single frame for live preview."""
    global live_preview_active
    try:
        if live_preview_active:
            return take_screenshot(quality)
        else:
            return {"error": "Live preview not active"}
    except Exception as e:
        return {"error": str(e)}

def get_audio_info():
    """Get audio device information and volume levels."""
    try:
        if platform.system() == "Windows":
            # Simple Windows volume check
            try:
                result = subprocess.run(['powershell', '-Command', 
                    '(Get-AudioDevice -PlaybackVolume).Volume'], 
                    capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    volume = int(float(result.stdout.strip()) * 100)
                else:
                    volume = 50  # Default
                
                return {
                    "volume": volume,
                    "muted": False,
                    "devices": ["Default Speaker"]
                }
            except:
                return {"volume": 50, "muted": False, "devices": ["Default Speaker"]}
        else:
            # Linux audio using amixer
            try:
                result = subprocess.run(['amixer', 'get', 'Master'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    import re
                    volume_match = re.search(r'(\d+)%', result.stdout)
                    mute_match = re.search(r'\[off\]', result.stdout)
                    
                    return {
                        "volume": int(volume_match.group(1)) if volume_match else 0,
                        "muted": bool(mute_match),
                        "devices": ["Master"]
                    }
            except:
                pass
        
        return {"volume": 50, "muted": False, "devices": ["Unknown"]}
    except Exception as e:
        return {"error": str(e)}

def set_volume(volume_level):
    """Set system volume (0-100)."""
    try:
        volume_level = max(0, min(100, int(volume_level)))  # Clamp 0-100
        
        if platform.system() == "Windows":
            # Windows volume control
            subprocess.run(['powershell', '-Command', 
                f'(Get-AudioDevice -PlaybackVolume).Volume = {volume_level/100}'], 
                timeout=5)
            return {"success": f"Volume set to {volume_level}%"}
        else:
            # Linux volume control
            subprocess.run(['amixer', 'set', 'Master', f'{volume_level}%'], timeout=5)
            return {"success": f"Volume set to {volume_level}%"}
    except Exception as e:
        return {"error": str(e)}

# ============ POWER MANAGEMENT ============

def power_operation(operation):
    """Perform power operations: shutdown, restart, sleep."""
    try:
        if platform.system() == "Windows":
            commands = {
                "shutdown": ["shutdown", "/s", "/t", "10", "/c", "Remote shutdown initiated"],
                "restart": ["shutdown", "/r", "/t", "10", "/c", "Remote restart initiated"], 
                "sleep": ["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"]
            }
        else:
            commands = {
                "shutdown": ["sudo", "shutdown", "-h", "+1", "Remote shutdown initiated"],
                "restart": ["sudo", "shutdown", "-r", "+1", "Remote restart initiated"],
                "sleep": ["systemctl", "suspend"]
            }
        
        if operation in commands:
            subprocess.Popen(commands[operation])
            return {"success": f"Initiated {operation} - will execute in 10 seconds (60 seconds for Linux)"}
        else:
            return {"error": f"Unknown operation: {operation}"}
    except Exception as e:
        return {"error": str(e)}

# ============ NETWORK MONITORING ============

def get_network_info():
    """Get detailed network information."""
    try:
        # Basic network stats
        net_io = psutil.net_io_counters()
        
        # Network interfaces
        interfaces = []
        for iface, addrs in psutil.net_if_addrs().items():
            iface_info = {"name": iface, "addresses": []}
            for addr in addrs:
                if addr.family.name in ['AF_INET', 'AF_INET6']:  # Only IP addresses
                    iface_info["addresses"].append({
                        "family": addr.family.name,
                        "address": addr.address,
                        "netmask": addr.netmask or ""
                    })
            if iface_info["addresses"]:  # Only include interfaces with IP addresses
                interfaces.append(iface_info)
        
        # Active connections (limited)
        connections = []
        try:
            for conn in psutil.net_connections(kind='inet')[:10]:  # Limit to 10
                if conn.status == 'ESTABLISHED':
                    connections.append({
                        "local": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "",
                        "remote": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "",
                        "status": conn.status
                    })
        except:
            connections = [{"info": "Connection details require admin privileges"}]
        
        return {
            "total_sent": net_io.bytes_sent,
            "total_recv": net_io.bytes_recv,
            "interfaces": interfaces,
            "connections": connections
        }
    except Exception as e:
        return {"error": str(e)}

# ============ SERVICE MANAGEMENT ============

def get_services():
    """Get system services status."""
    try:
        services = []
        
        if platform.system() == "Windows":
            # Windows services - simplified
            try:
                result = subprocess.run(['sc', 'query'], capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    lines = result.stdout.split('\n')
                    current_service = {}
                    
                    for line in lines:
                        if 'SERVICE_NAME:' in line:
                            if current_service and 'name' in current_service:
                                services.append(current_service)
                            current_service = {"name": line.split(':', 1)[1].strip()}
                        elif 'STATE:' in line and current_service:
                            state_info = line.split(':', 1)[1].strip()
                            current_service["status"] = state_info.split()[0] if state_info else "UNKNOWN"
                        elif 'DISPLAY_NAME:' in line and current_service:
                            current_service["display_name"] = line.split(':', 1)[1].strip()
                    
                    if current_service and 'name' in current_service:
                        services.append(current_service)
            except:
                services = [{"name": "Service query requires admin privileges", "status": "INFO", "display_name": "Admin Required"}]
        else:
            # Linux systemd services
            try:
                result = subprocess.run(['systemctl', 'list-units', '--type=service', '--no-pager'], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    lines = result.stdout.split('\n')[1:]  # Skip header
                    for line in lines:
                        if line.strip() and not line.startswith('UNIT'):
                            parts = line.split()
                            if len(parts) >= 3:
                                services.append({
                                    "name": parts[0].replace('.service', ''),
                                    "status": parts[2],
                                    "display_name": parts[0]
                                })
            except:
                services = [{"name": "systemctl", "status": "requires sudo", "display_name": "System Services"}]
        
        return {"services": services[:20]}  # Limit to 20 services
    except Exception as e:
        return {"error": str(e)}

# ============ ENVIRONMENT VARIABLES ============

def get_environment_variables():
    """Get system environment variables."""
    try:
        env_vars = []
        important_vars = ['PATH', 'HOME', 'USER', 'USERNAME', 'USERPROFILE', 'SYSTEMROOT', 'PYTHONPATH', 'JAVA_HOME', 'NODE_PATH']
        
        # Get all environment variables
        for key, value in os.environ.items():
            # Prioritize important variables
            priority = 0 if key in important_vars else 1
            env_vars.append({
                "name": key, 
                "value": value[:100] + "..." if len(value) > 100 else value,  # Truncate long values
                "priority": priority
            })
        
        # Sort by priority then name
        env_vars.sort(key=lambda x: (x['priority'], x['name'].lower()))
        
        return {"variables": env_vars[:50]}  # Limit to 50 variables
    except Exception as e:
        return {"error": str(e)}

# ============ LOG VIEWER ============

def get_system_logs(log_type="system", lines=50):
    """Get system logs."""
    try:
        logs = []
        lines = min(lines, 100)  # Limit to 100 lines max
        
        if platform.system() == "Windows":
            # Windows Event Logs - simplified
            try:
                if log_type == "system":
                    cmd = ['powershell', '-Command', 
                          f'Get-EventLog -LogName System -Newest {lines} | Select-Object TimeGenerated,Source,EntryType,Message | ConvertTo-Json -Compress']
                elif log_type == "application":
                    cmd = ['powershell', '-Command',
                          f'Get-EventLog -LogName Application -Newest {lines} | Select-Object TimeGenerated,Source,EntryType,Message | ConvertTo-Json -Compress']
                else:
                    return {"logs": [{"message": "Available log types: system, application", "level": "INFO"}]}
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
                if result.returncode == 0 and result.stdout.strip():
                    try:
                        logs_data = json.loads(result.stdout)
                        if isinstance(logs_data, list):
                            logs = [{"timestamp": log.get("TimeGenerated", ""), 
                                   "source": log.get("Source", ""), 
                                   "level": log.get("EntryType", ""),
                                   "message": (log.get("Message", "")[:200] + "...") if len(log.get("Message", "")) > 200 else log.get("Message", "")}
                                  for log in logs_data]
                        elif isinstance(logs_data, dict):
                            logs = [{"timestamp": logs_data.get("TimeGenerated", ""),
                                   "source": logs_data.get("Source", ""),
                                   "level": logs_data.get("EntryType", ""),
                                   "message": logs_data.get("Message", "")}]
                    except json.JSONDecodeError:
                        logs = [{"message": "Failed to parse Windows event logs", "level": "ERROR"}]
                else:
                    logs = [{"message": "No recent events or access denied", "level": "INFO"}]
            except Exception as e:
                logs = [{"message": f"Windows event log error: {str(e)}", "level": "ERROR"}]
        else:
            # Linux logs
            try:
                if log_type == "system":
                    # Try journalctl first
                    result = subprocess.run(['journalctl', '-n', str(lines), '--no-pager'], 
                                          capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        for line in result.stdout.split('\n')[-lines:]:
                            if line.strip():
                                logs.append({"message": line.strip(), "level": "INFO"})
                    else:
                        # Fallback to /var/log/syslog
                        result = subprocess.run(['tail', f'-{lines}', '/var/log/syslog'], 
                                              capture_output=True, text=True, timeout=5)
                        if result.returncode == 0:
                            for line in result.stdout.split('\n'):
                                if line.strip():
                                    logs.append({"message": line.strip(), "level": "INFO"})
                elif log_type == "auth":
                    result = subprocess.run(['tail', f'-{lines}', '/var/log/auth.log'], 
                                          capture_output=True, text=True, timeout=5)
                    if result.returncode == 0:
                        for line in result.stdout.split('\n'):
                            if line.strip():
                                level = "ERROR" if "failed" in line.lower() else "INFO"
                                logs.append({"message": line.strip(), "level": level})
                else:
                    logs = [{"message": "Available log types: system, auth", "level": "INFO"}]
            except Exception as e:
                logs = [{"message": f"Linux log error: {str(e)}", "level": "ERROR"}]
        
        if not logs:
            logs = [{"message": "No logs available or access denied", "level": "INFO"}]
        
        return {"logs": logs}
    except Exception as e:
        return {"error": str(e)}

# ============ AI ASSISTANT FEATURES ============

def get_system_context():
    """Gather comprehensive system context for AI analysis."""
    try:
        context = {
            "system_info": get_system_info(),
            "system_stats": get_system_stats(),
            "processes": get_processes(),
            "directory": get_directory_contents("."),
            "network": get_network_info(),
            "environment": get_environment_variables(),
            "platform": platform.system(),
            "hostname": socket.gethostname(),
            "working_directory": current_working_dir
        }
        return context
    except Exception as e:
        return {"error": str(e)}

def ai_analyze_system(query="", context_type="general"):
    """Use Gemini AI to analyze system and provide insights."""
    if not AI_ENABLED:
        return {"error": "AI assistant is not available. Please configure GEMINI_API_KEY."}
    
    try:
        # Get system context
        context = get_system_context()
        
        # Create comprehensive structured prompt
        system_prompt = f"""
You are OmniControl AI - an advanced system administration assistant with real-time system monitoring capabilities.

🔍 CURRENT SYSTEM STATUS:
• Platform: {context.get('platform', 'Unknown')}
• Hostname: {context.get('hostname', 'Unknown')}
• Working Directory: {context.get('working_directory', 'Unknown')}
• CPU Usage: {context.get('system_stats', {}).get('cpu_percent', 'Unknown')}%
• RAM Usage: {context.get('system_stats', {}).get('ram_percent', 'Unknown')}%
• Disk Usage: {context.get('system_stats', {}).get('disk_percent', 'Unknown')}%
• Active Processes: {len(context.get('processes', {}).get('processes', []))}
• Network Interfaces: {len(context.get('network', {}).get('interfaces', []))}

📝 USER REQUEST: {query}
🎯 ANALYSIS TYPE: {context_type}

PLEASE FORMAT YOUR RESPONSE USING THIS EXACT STRUCTURE FOR OPTIMAL DISPLAY:

## 📊 ANALYSIS SUMMARY
Provide a brief overview of the current system state and key findings in 1-2 sentences.

## 🔍 DETAILED INSIGHTS
Format each metric analysis as follows (use this EXACT format):
* **CPU Performance ({context.get('system_stats', {}).get('cpu_percent', 'Unknown')}%):** [Analysis of CPU usage and performance]
* **Memory Efficiency ({context.get('system_stats', {}).get('ram_percent', 'Unknown')}%):** [Analysis of RAM usage and efficiency]
* **Storage Status ({context.get('system_stats', {}).get('disk_percent', 'Unknown')}%):** [Analysis of disk usage and storage]
* **Process Management:** [Analysis of active processes and system health]
* **Connectivity:** [Analysis of network interfaces and connectivity]

## ⚠️ ISSUES IDENTIFIED
Format issues with severity indicators:
* 🟢 **Info:** [Description of informational items]
* 🟡 **Warning:** [Description of warning-level issues]
* 🔴 **Critical:** [Description of critical issues]

## 💡 RECOMMENDATIONS
Format recommendations as numbered actionable items:
1. **[Action Title]:** [Detailed description of recommended action]
2. **[Action Title]:** [Detailed description of recommended action]
3. **[Action Title]:** [Detailed description of recommended action]

## 🛠️ SUGGESTED COMMANDS
Provide safe, relevant commands in code blocks:
```bash
# Command description
command here
```

## 📈 NEXT STEPS
* Monitor for specific changes or improvements
* Schedule regular maintenance tasks
* Set up additional monitoring if needed

Be precise, professional, and focus on actionable insights. Use the exact formatting shown above for optimal table display.
"""

        response = ai_model.generate_content(system_prompt)
        
        # Extract commands if any
        commands = extract_commands_from_text(response.text)
        
        return {
            "response": response.text,
            "suggested_commands": commands,
            "context_used": context_type,
            "timestamp": time.time()
        }
        
    except Exception as e:
        return {"error": f"AI analysis failed: {str(e)}"}

def ai_generate_commands(task_description):
    """Generate appropriate commands for a given task."""
    if not AI_ENABLED:
        return {"error": "AI assistant is not available."}
    
    try:
        context = get_system_context()
        platform_info = context.get('platform', 'Unknown')
        
        prompt = f"""
You are a command-line expert for {platform_info} systems. Generate safe and appropriate commands for this task:

Task: {task_description}

System Context:
- Platform: {platform_info}
- Working Directory: {context.get('working_directory', '.')}
- Available tools: Basic system utilities, package managers, file operations

Provide ONLY the commands, one per line, without explanations or formatting. 
Ensure commands are safe and appropriate for the system.
Avoid destructive operations unless explicitly requested and safe.
"""

        response = ai_model.generate_content(prompt)
        commands = [cmd.strip() for cmd in response.text.split('\n') if cmd.strip() and not cmd.strip().startswith('#')]
        
        return {
            "commands": commands,
            "task": task_description,
            "platform": platform_info
        }
        
    except Exception as e:
        return {"error": f"Command generation failed: {str(e)}"}

def ai_security_analysis():
    """Perform AI-powered security analysis of the system."""
    if not AI_ENABLED:
        return {"error": "AI assistant is not available."}
    
    try:
        context = get_system_context()
        
        # Get recent logs for security analysis
        recent_logs = get_system_logs("auth", 20)
        processes = context.get('processes', {}).get('processes', [])
        network = context.get('network', {})
        
        prompt = f"""
You are OmniControl Security AI - performing comprehensive security analysis.

🔒 SYSTEM SECURITY SCAN

📋 SYSTEM OVERVIEW:
• Platform: {context.get('platform')}
• Total Processes: {len(processes)}
• Network Connections: {len(network.get('connections', []))}
• High CPU Processes: {[p['name'] for p in processes[:5] if p.get('cpu_percent', 0) > 10]}
• Authentication Logs: {len(recent_logs.get('logs', []))} entries

FORMAT YOUR SECURITY REPORT AS FOLLOWS:

## 🛡️ SECURITY ASSESSMENT SUMMARY
**Overall Risk Level**: [🔴 HIGH | 🟡 MEDIUM | 🟢 LOW]

## 🔍 DETAILED SECURITY ANALYSIS

### 🏃 Process Analysis
[Analyze running processes for suspicious activity]

### 🌐 Network Security
[Review network connections and ports]

### 🔐 Authentication Review
[Check auth logs for unusual activity]

### 📁 System Permissions
[Review file permissions and access controls]

## ⚠️ SECURITY FINDINGS
### 🔴 Critical Issues
[List critical security concerns]

### 🟡 Warnings
[List moderate security concerns]

### 🟢 Information
[List minor observations]

## 🔧 SECURITY RECOMMENDATIONS
1. **Immediate Actions** (Priority: High)
   [Critical fixes needed now]

2. **Short-term Improvements** (Priority: Medium)
   [Improvements within days/weeks]

3. **Long-term Hardening** (Priority: Low)
   [Ongoing security enhancements]

## 🛠️ SECURITY COMMANDS
```bash
# Safe security-related commands
```

## 📊 SECURITY SCORE
**Overall Security Score**: [X/100]

Be thorough but practical. Focus on real, actionable security improvements.
"""

        response = ai_model.generate_content(prompt)
        
        return {
            "security_report": response.text,
            "analysis_timestamp": time.time(),
            "processes_analyzed": len(processes),
            "connections_analyzed": len(network.get('connections', []))
        }
        
    except Exception as e:
        return {"error": f"Security analysis failed: {str(e)}"}

def ai_performance_optimization():
    """AI-powered performance optimization suggestions."""
    if not AI_ENABLED:
        return {"error": "AI assistant is not available."}
    
    try:
        context = get_system_context()
        stats = context.get('system_stats', {})
        processes = context.get('processes', {}).get('processes', [])
        
        # Get top resource-consuming processes
        top_cpu = sorted(processes, key=lambda x: x.get('cpu_percent', 0), reverse=True)[:10]
        top_memory = sorted(processes, key=lambda x: x.get('memory_percent', 0), reverse=True)[:10]
        
        prompt = f"""
You are OmniControl Performance AI - analyzing system performance and optimization opportunities.

⚡ PERFORMANCE OPTIMIZATION ANALYSIS

📊 CURRENT SYSTEM METRICS:
• CPU Usage: {stats.get('cpu_percent', 0)}%
• RAM Usage: {stats.get('ram_percent', 0)}%
• Disk Usage: {stats.get('disk_percent', 0)}%
• Active Processes: {len(processes)}

🔥 TOP RESOURCE CONSUMERS:
CPU: {[f"{p['name']}: {p.get('cpu_percent', 0)}%" for p in top_cpu[:5]]}
RAM: {[f"{p['name']}: {p.get('memory_percent', 0)}%" for p in top_memory[:5]]}

PLEASE FORMAT YOUR PERFORMANCE REPORT AS:

## 🎯 PERFORMANCE SUMMARY
**System Health**: [🔴 Poor | 🟡 Fair | 🟢 Good | 💚 Excellent]
**Performance Score**: [X/100]

## 📈 RESOURCE ANALYSIS

### 🖥️ CPU Performance
[Analysis of CPU usage patterns and bottlenecks]

### 🧠 Memory Utilization
[RAM usage analysis and memory leaks detection]

### 💾 Storage Performance
[Disk usage and I/O performance review]

### 🌐 Network Performance
[Network utilization and bottlenecks]

## ⚡ OPTIMIZATION OPPORTUNITIES

### 🚀 Quick Wins (Immediate Impact)
1. [Immediate optimizations with high impact]

### 🛠️ System Tuning (Medium-term)
1. [Configuration changes and system tuning]

### 🏗️ Infrastructure Improvements (Long-term)
1. [Hardware or major software recommendations]

## 🔧 OPTIMIZATION COMMANDS
```bash
# Safe performance optimization commands
```

## 📊 MONITORING SETUP
```bash
# Commands for ongoing performance monitoring
```

## 📋 MAINTENANCE SCHEDULE
• **Daily**: [Quick maintenance tasks]
• **Weekly**: [Regular maintenance tasks]
• **Monthly**: [Comprehensive system review]

## 🎯 EXPECTED IMPROVEMENTS
[Quantify expected performance gains from recommendations]

Focus on safe, measurable improvements with clear impact assessment.
"""

        response = ai_model.generate_content(prompt)
        
        return {
            "optimization_report": response.text,
            "current_performance": {
                "cpu": stats.get('cpu_percent', 0),
                "memory": stats.get('ram_percent', 0),
                "disk": stats.get('disk_percent', 0)
            },
            "top_processes": {
                "cpu": top_cpu[:5],
                "memory": top_memory[:5]
            }
        }
        
    except Exception as e:
        return {"error": f"Performance optimization failed: {str(e)}"}

def extract_commands_from_text(text):
    """Extract potential commands from AI response text."""
    commands = []
    
    # Look for code blocks
    code_blocks = re.findall(r'```(?:bash|shell|cmd)?\n([^`]+)```', text, re.MULTILINE)
    for block in code_blocks:
        commands.extend([line.strip() for line in block.split('\n') if line.strip() and not line.strip().startswith('#')])
    
    # Look for lines starting with common command prefixes
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if (line.startswith('sudo ') or line.startswith('ls ') or line.startswith('cd ') or 
            line.startswith('ps ') or line.startswith('top ') or line.startswith('htop ') or
            line.startswith('df ') or line.startswith('du ') or line.startswith('find ') or
            line.startswith('grep ') or line.startswith('awk ') or line.startswith('systemctl ') or
            line.startswith('service ') or line.startswith('netstat ') or line.startswith('ss ')):
            commands.append(line)
    
    return commands[:10]  # Limit to 10 commands

def get_system_info():
    """Get detailed system information."""
    try:
        uname = platform.uname()
        return {
            "system": uname.system,
            "node": uname.node,
            "release": uname.release,
            "version": uname.version,
            "machine": uname.machine,
            "processor": uname.processor,
            "python_version": platform.python_version(),
            "cpu_count_logical": psutil.cpu_count(logical=True),
            "cpu_count_physical": psutil.cpu_count(logical=False),
            "memory_total": psutil.virtual_memory().total,
            "disk_partitions": [{"device": p.device, "mountpoint": p.mountpoint, "fstype": p.fstype} 
                              for p in psutil.disk_partitions()],
            "network_interfaces": list(psutil.net_if_addrs().keys())
        }
    except Exception as e:
        return {"error": str(e)}

async def execute_command(command):
    """Enhanced command execution with persistent working directory."""
    global current_working_dir
    
    try:
        # Handle directory change commands specially
        if command.strip().startswith('cd '):
            path = command.strip()[3:].strip()
            if not path:
                path = os.path.expanduser('~')  # cd with no args goes to home
            
            try:
                # Resolve the path relative to current working directory
                if not os.path.isabs(path):
                    path = os.path.join(current_working_dir, path)
                
                path = os.path.normpath(path)
                
                if os.path.exists(path) and os.path.isdir(path):
                    current_working_dir = path
                    return {
                        "output": f"Changed directory to: {current_working_dir}",
                        "exit_code": 0
                    }
                else:
                    return {
                        "output": f"cd: {path}: No such file or directory",
                        "exit_code": 1
                    }
            except Exception as e:
                return {
                    "output": f"cd: {str(e)}",
                    "exit_code": 1
                }
        
        # For other commands, execute in current working directory
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=current_working_dir  # Set working directory
        )
        stdout, stderr = await process.communicate()
        
        result = ""
        if stdout:
            result += stdout.decode('utf-8', errors='replace')
        if stderr:
            result += "\nSTDERR:\n" + stderr.decode('utf-8', errors='replace')
            
        return {
            "output": result.strip(),
            "exit_code": process.returncode,
            "working_dir": current_working_dir
        }
    except Exception as e:
        return {"output": f"Error: {str(e)}", "exit_code": -1, "working_dir": current_working_dir}

async def handle_request(data):
    """Handle different types of requests from the server."""
    request_type = data.get("type")
    
    if request_type == "execute":
        return await execute_command(data["cmd"])
    elif request_type == "get_processes":
        return get_processes()
    elif request_type == "get_directory":
        return get_directory_contents(data.get("path", "."))
    elif request_type == "kill_process":
        return kill_process(data["pid"])
    elif request_type == "get_system_info":
        return get_system_info()
    elif request_type == "read_file":
        return read_file_content(data["file_path"])
    elif request_type == "open_file":
        return open_file_with_system(data["file_path"])
    elif request_type == "download_file":
        return download_file(data["file_path"])
    elif request_type == "search_files":
        return search_files(data["query"], data.get("path", "."))
    elif request_type == "create_file":
        return create_file(data["file_path"], data.get("content", ""))
    elif request_type == "create_directory":
        return create_directory(data["dir_path"])
    elif request_type == "delete_item":
        return delete_file_or_directory(data["path"])
    elif request_type == "rename_item":
        return rename_file_or_directory(data["old_path"], data["new_name"])
    elif request_type == "copy_item":
        return copy_file_or_directory(data["source_path"], data["dest_path"])
    
    # ========== REMOTE DESKTOP & MEDIA ==========
    elif request_type == "take_screenshot":
        quality = data.get("quality", "medium")
        return take_screenshot(quality)
    elif request_type == "start_live_preview":
        quality = data.get("quality", "medium")
        interval = data.get("interval", 1)
        return start_live_preview(quality, interval)
    elif request_type == "stop_live_preview":
        return stop_live_preview()
    elif request_type == "get_live_frame":
        quality = data.get("quality", "medium")
        return get_live_frame(quality)
    elif request_type == "get_audio_info":
        return get_audio_info()
    elif request_type == "set_volume":
        return set_volume(data.get("volume", 50))
    
    # ========== POWER MANAGEMENT ==========
    elif request_type == "power_operation":
        return power_operation(data.get("operation", ""))
    
    # ========== NETWORK MONITORING ==========
    elif request_type == "get_network_info":
        return get_network_info()
    
    # ========== SERVICE MANAGEMENT ==========
    elif request_type == "get_services":
        return get_services()
    
    # ========== ENVIRONMENT VARIABLES ==========
    elif request_type == "get_environment_variables":
        return get_environment_variables()
    
    # ========== LOG VIEWER ==========
    elif request_type == "get_system_logs":
        return get_system_logs(data.get("log_type", "system"), data.get("lines", 50))
    
    # ========== AI ASSISTANT ==========
    elif request_type == "ai_analyze_system":
        return ai_analyze_system(data.get("query", ""), data.get("context_type", "general"))
    elif request_type == "ai_generate_commands":
        return ai_generate_commands(data.get("task_description", ""))
    elif request_type == "ai_security_analysis":
        return ai_security_analysis()
    elif request_type == "ai_performance_optimization":
        return ai_performance_optimization()
    elif request_type == "get_system_context":
        return get_system_context()
    
    elif request_type == "upload_file":
        return upload_file(data["file_path"], data["content"])
    elif request_type == "get_disk_usage":
        return get_disk_usage(data.get("path", "."))
    else:
        return {"error": f"Unknown request type: {request_type}"}

async def connect_to_server():
    """Enhanced connection with multiple features."""
    print(f"Attempting connection to {SERVER_URL}...")
    async with websockets.connect(SERVER_URL) as websocket:
        print("Connected to Central Command!")
        
        hostname = socket.gethostname()
        
        # 1. Register device with enhanced info
        system_info = get_system_info()
        await websocket.send(json.dumps({
            "type": "register",
            "device_id": hostname,
            "platform": platform.system(),
            "system_info": system_info
        }))

        receive_task = asyncio.create_task(websocket.recv())

        while True:
            # Send enhanced stats
            stats = get_system_stats()
            heartbeat_msg = {
                "type": "stats",
                "device_id": hostname,
                "data": stats
            }
            
            await websocket.send(json.dumps(heartbeat_msg))

            # Wait for commands
            done, pending = await asyncio.wait(
                [receive_task],
                timeout=3.0,
                return_when=asyncio.FIRST_COMPLETED
            )

            if receive_task in done:
                try:
                    message = receive_task.result()
                    data = json.loads(message)
                    
                    print(f"Received request: {data.get('type', 'unknown')}")
                    
                    # Handle different request types
                    result = await handle_request(data)
                    
                    # Send result back with request ID for tracking
                    await websocket.send(json.dumps({
                        "type": "response",
                        "device_id": hostname,
                        "request_id": data.get("request_id"),
                        "request_type": data.get("type"),
                        "result": result
                    }))
                    
                    receive_task = asyncio.create_task(websocket.recv())
                    
                except websockets.exceptions.ConnectionClosed:
                    print("Connection lost.")
                    break
                except Exception as e:
                    print(f"Error handling request: {e}")

if __name__ == "__main__":
    while True:
        try:
            asyncio.run(connect_to_server())
        except Exception as e:
            print(f"Connection error: {e}. Retrying in 5s...")
            time.sleep(5)
