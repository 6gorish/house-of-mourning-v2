'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'

interface ArtistProfileProps {
  content: string
}

export default function ArtistProfile({ content }: ArtistProfileProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Parse the HTML content and enhance ALL artist sections
    const sections = containerRef.current.querySelectorAll('h2, h3')
    
    sections.forEach((heading) => {
      const artistSection = heading.parentElement
      if (!artistSection) return

      // Check if this is a top-level section header (skip "# Producers / Curators" etc)
      if (heading.tagName === 'H1') return
      
      // Look for **image:** pattern - need to check multiple elements
      let hasImage = false
      let imagePath = ''
      let imageElement = null
      
      // Check the element immediately after the heading
      let checkElement = heading.nextElementSibling
      
      // The image line might be in the same paragraph as the discipline or separate
      while (checkElement && !['H2', 'H3', 'HR'].includes(checkElement.tagName)) {
        if (checkElement.textContent?.includes('image:')) {
          const imageMatch = checkElement.textContent.match(/image:\s*([^\s]+)/)
          if (imageMatch) {
            hasImage = true
            imagePath = imageMatch[1]
            imageElement = checkElement
            break
          }
        }
        checkElement = checkElement.nextElementSibling
        // Only check first few elements
        if (!checkElement || checkElement !== heading.nextElementSibling?.nextElementSibling) break
      }

      // Create artist profile section (with or without image)
      const profileSection = document.createElement('div')
      profileSection.className = 'artist-profile-section mb-0'
      
      if (hasImage) {
        // Two-column layout for artists with images
        const profileGrid = document.createElement('div')
        profileGrid.className = 'grid md:grid-cols-[1fr_320px] gap-6 md:gap-12 items-start'
        
        // Create bio column
        const bioColumn = document.createElement('div')
        bioColumn.className = 'artist-bio'
        
        // Add heading
        const headingClone = heading.cloneNode(true) as HTMLElement
        headingClone.className = 'text-3xl md:text-4xl font-light tracking-tight text-stone-900 mb-0 mt-0'
        bioColumn.appendChild(headingClone)

        // Collect all content until next h2/h3 or hr
        let currentElement = heading.nextElementSibling
        const bioContent: HTMLElement[] = []
        
        while (currentElement && !['H2', 'H3', 'HR'].includes(currentElement.tagName)) {
          // ALWAYS include the element - we'll clean it up later
          bioContent.push(currentElement as HTMLElement)
          currentElement = currentElement.nextElementSibling
        }

        bioContent.forEach((el, index) => {
          const clone = el.cloneNode(true) as HTMLElement
          
          // Remove any remaining "image:" text from content FIRST
          const originalHTML = clone.innerHTML
          if (clone.textContent?.includes('image:')) {
            clone.innerHTML = clone.innerHTML.replace(/\s*<strong>.*?image:.*?<\/strong>\s*[^\s<]*/gi, '')
            clone.innerHTML = clone.innerHTML.replace(/\*\*image:.*?\*\*\s*[^\s<]*/gi, '')
            clone.innerHTML = clone.innerHTML.replace(/image:\s*[^\s<\n]*/gi, '')
            // Also remove any **image:** without strong tags
            clone.innerHTML = clone.innerHTML.trim()
          }
          
          // Check if this is the role line: first element, paragraph, starts with <em>
          const startsWithEm = clone.tagName === 'P' && clone.innerHTML.trim().startsWith('<em>')
          const isRole = index === 0 && startsWithEm
          
          if (isRole) {
            // Style as subtitle/role
            clone.className = 'text-lg md:text-xl font-light italic text-stone-600 mb-4 mt-1'
          } else if (clone.tagName === 'P') {
            // Style as regular paragraph
            clone.className = 'text-base md:text-lg font-light leading-relaxed text-stone-700'
          }
          
          // Only add if there's actual content left
          if (clone.textContent?.trim() && clone.innerHTML.trim()) {
            bioColumn.appendChild(clone)
          }
        })

        // Create image column
        const imageColumn = document.createElement('div')
        imageColumn.className = 'artist-image-container w-full'
        
        const imageWrapper = document.createElement('div')
        imageWrapper.className = 'relative w-full flex justify-center items-start'
        
        const img = document.createElement('img')
        img.src = `/images/artists/headshots/${imagePath}`
        img.alt = heading.textContent || 'Artist headshot'
        img.className = 'artist-headshot-img w-full md:max-w-full h-auto rounded-sm shadow-lg grayscale-[30%] hover:grayscale-0 transition-all duration-500'
        img.loading = 'lazy'
        
        img.onload = function() {
          const isPortrait = img.naturalHeight > img.naturalWidth
          const isSquare = Math.abs(img.naturalHeight - img.naturalWidth) < 50
          
          if (isPortrait) {
            // Portrait: on mobile use full width, on desktop limit width
            img.classList.add('md:max-w-[320px]')
            img.style.maxHeight = '500px'
          } else if (isSquare) {
            // Square: on mobile use full width, on desktop limit width
            img.classList.add('md:max-w-[320px]')
          } else {
            // Landscape: limit height on all screens
            img.style.maxHeight = '400px'
            img.style.width = 'auto'
            // Center landscape images
            img.parentElement!.classList.add('justify-center')
          }
        }
        
        imageWrapper.appendChild(img)
        imageColumn.appendChild(imageWrapper)

        profileGrid.appendChild(bioColumn)
        profileGrid.appendChild(imageColumn)
        profileSection.appendChild(profileGrid)
        
        // Remove original bio content
        bioContent.forEach(el => el.remove())
        
      } else {
        // Single-column layout for artists without images
        const bioColumn = document.createElement('div')
        bioColumn.className = 'artist-bio max-w-4xl'
        
        // Add heading
        const headingClone = heading.cloneNode(true) as HTMLElement
        headingClone.className = 'text-3xl md:text-4xl font-light tracking-tight text-stone-900 mb-0 mt-0'
        bioColumn.appendChild(headingClone)

        // Collect all content until next h2/h3 or hr
        let currentElement = heading.nextElementSibling
        const bioContent: HTMLElement[] = []
        
        while (currentElement && !['H2', 'H3', 'HR'].includes(currentElement.tagName)) {
          bioContent.push(currentElement as HTMLElement)
          currentElement = currentElement.nextElementSibling
        }

        bioContent.forEach((el, index) => {
          const clone = el.cloneNode(true) as HTMLElement
          
          // Check if this is the role line: first element, paragraph, starts with <em>
          const startsWithEm = clone.tagName === 'P' && clone.innerHTML.trim().startsWith('<em>')
          const isRole = index === 0 && startsWithEm
          
          if (isRole) {
            // Style as subtitle/role
            clone.className = 'text-lg md:text-xl font-light italic text-stone-600 mb-4 mt-1'
          } else if (clone.tagName === 'P') {
            // Style as regular paragraph
            clone.className = 'text-base md:text-lg font-light leading-relaxed text-stone-700'
          }
          
          bioColumn.appendChild(clone)
        })

        profileSection.appendChild(bioColumn)
        
        // Remove original bio content
        bioContent.forEach(el => el.remove())
      }

      // Replace original content with new layout
      heading.parentNode?.insertBefore(profileSection, heading)
      
      // Remove original heading
      heading.remove()
    })
  }, [content])

  return (
    <div 
      ref={containerRef}
      className="artist-profiles prose prose-stone prose-lg max-w-none
                 [&>h1]:text-4xl [&>h1]:md:text-5xl [&>h1]:font-light [&>h1]:tracking-tight [&>h1]:mb-8
                 [&>h2]:text-3xl [&>h2]:md:text-4xl [&>h2]:font-light [&>h2]:tracking-tight [&>h2]:mt-16 [&>h2]:mb-6
                 [&>h3]:text-2xl [&>h3]:md:text-3xl [&>h3]:font-normal [&>h3]:tracking-tight [&>h3]:mt-12 [&>h3]:mb-4
                 [&>p]:text-base [&>p]:md:text-lg [&>p]:font-light [&>p]:leading-relaxed [&>p]:text-stone-700 [&>p]:mb-6
                 [&>hr]:mt-0 [&>hr]:mb-6 [&>hr]:border-stone-200"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
