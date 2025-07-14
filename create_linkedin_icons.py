#!/usr/bin/env python3
"""
Create LinkedIn-style chat bubble icons with blue background and white bubble
LinkedIn brand color: #0A66C2
"""

from PIL import Image, ImageDraw
import os

def create_linkedin_chat_icon(size):
    """Create a LinkedIn-style chat bubble icon"""
    # LinkedIn blue color
    linkedin_blue = "#0A66C2"
    white = "#FFFFFF"
    
    # Create image with LinkedIn blue background
    img = Image.new('RGB', (size, size), linkedin_blue)
    draw = ImageDraw.Draw(img)
    
    # Calculate bubble dimensions (about 70% of icon size)
    bubble_size = int(size * 0.7)
    margin = (size - bubble_size) // 2
    
    # Draw main chat bubble (rounded rectangle)
    bubble_left = margin
    bubble_top = margin
    bubble_right = margin + bubble_size
    bubble_bottom = margin + int(bubble_size * 0.75)
    
    # Draw rounded rectangle for chat bubble
    corner_radius = int(bubble_size * 0.15)
    draw.rounded_rectangle(
        [bubble_left, bubble_top, bubble_right, bubble_bottom],
        radius=corner_radius,
        fill=white
    )
    
    # Draw chat bubble tail (small triangle)
    tail_size = int(bubble_size * 0.2)
    tail_x = bubble_left + int(bubble_size * 0.3)
    tail_y = bubble_bottom
    
    # Triangle points for chat bubble tail
    tail_points = [
        (tail_x, tail_y),
        (tail_x + tail_size, tail_y),
        (tail_x + tail_size//2, tail_y + tail_size//2)
    ]
    draw.polygon(tail_points, fill=white)
    
    # Add small dots inside bubble to indicate text/conversation
    dot_radius = max(1, size // 32)
    dot_y = bubble_top + bubble_size // 3
    
    # Three dots horizontally centered
    center_x = bubble_left + bubble_size // 2
    dot_spacing = bubble_size // 6
    
    for i in range(3):
        dot_x = center_x - dot_spacing + (i * dot_spacing)
        draw.ellipse([
            dot_x - dot_radius, dot_y - dot_radius,
            dot_x + dot_radius, dot_y + dot_radius
        ], fill=linkedin_blue)
    
    return img

def main():
    # Create icons directory if it doesn't exist
    icons_dir = "src/icons"
    os.makedirs(icons_dir, exist_ok=True)
    
    # Create icons in different sizes
    sizes = [16, 32, 64, 128]
    
    for size in sizes:
        icon = create_linkedin_chat_icon(size)
        filename = f"{icons_dir}/logo-{size}.png"
        icon.save(filename, "PNG")
        print(f"Created {filename}")

if __name__ == "__main__":
    main()
