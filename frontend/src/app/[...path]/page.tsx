'use client';

import { useEffect, useState } from 'react';
import { extractPage } from '@/lib/api';
import { usePathname } from 'next/navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DynamicPage() {
  const pathname = usePathname();
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        setLoading(true);
        
        // Convert Next.js path to source path
        const sourcePath = pathname === '/' ? '/' : pathname;
        console.log(`🔄 Fetching page: ${sourcePath}`);
        
        // Fetch full HTML structure for exact design
        const data = await extractPage(sourcePath, true);
        
        if (!data) {
          throw new Error('No data received from API');
        }
        
        console.log(`✅ Page data received for: ${sourcePath}`);
        setPageData(data);
        setLoading(false);
      } catch (error: any) {
        console.error('❌ Error fetching data:', error);
        setError(error?.message || 'Failed to fetch data');
        setLoading(false);
      }
    }
    
    fetchData();
    
    // Auto-refresh every 30 seconds for live data
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

    // Inject CSS, JavaScript, and enable interactions
  useEffect(() => {
    if (!pageData) return;
    
    // Inject style tags
    if (pageData.css?.styleTags && Array.isArray(pageData.css.styleTags)) {
      pageData.css.styleTags.forEach((styleContent: any, i: number) => {
        const styleId = `cricinfobuzz-style-${i}-${pathname}`;
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = typeof styleContent === 'string' ? styleContent : (styleContent?.css || '');
          document.head.appendChild(style);
        }
      });
    }
    
    // Inject external CSS
    if (pageData.css?.external && Array.isArray(pageData.css.external)) {
      pageData.css.external.forEach((stylesheet: any) => {
        const href = typeof stylesheet === 'string' ? stylesheet : stylesheet.href;
        if (href) {
          const linkId = `cricinfobuzz-link-${href}`;
          if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = href.startsWith('http') ? href : `https://www.cricbuzz.com${href}`;
            if (stylesheet?.media) link.media = stylesheet.media;
            document.head.appendChild(link);
          }
        }
      });
    }
    
    // Inject external JavaScript files (but only safe ones from source domain)
    // Skip any scripts that reference webpack/next/modules to avoid conflicts
    if (pageData.javascript?.external && Array.isArray(pageData.javascript.external)) {
      const safeScripts = pageData.javascript.external.filter((scriptItem: any) => {
        const scriptSrc = typeof scriptItem === 'string' ? scriptItem : scriptItem?.src;
        if (!scriptSrc) return false;
        
        // Only allow scripts from source domain and exclude webpack/next references
        const isSourceDomain = scriptSrc.includes('cricbuzz.com') || scriptSrc.startsWith('/');
        const hasWebpackRef = /webpack|__webpack|next|node_modules|\/src\/|\/components\/|\.ts|\.jsx?/.test(scriptSrc);
        
        return isSourceDomain && !hasWebpackRef;
      });
      
      if (safeScripts.length > 0) {
        const loadScript = (scriptSrc: string, index: number) => {
          return new Promise<void>((resolve, reject) => {
            const scriptId = `cricinfobuzz-script-${index}-${pathname}`;
            if (document.getElementById(scriptId)) {
              resolve();
              return;
            }
            
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = scriptSrc.startsWith('http') ? scriptSrc : `https://www.cricbuzz.com${scriptSrc}`;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
              console.warn(`⚠️ Failed to load script: ${scriptSrc}`);
              resolve(); // Don't reject, just continue
            };
            document.head.appendChild(script);
          });
        };
        
        // Load all safe external scripts sequentially
        const loadAllScripts = async () => {
          for (let i = 0; i < safeScripts.length; i++) {
            const scriptSrc = typeof safeScripts[i] === 'string' 
              ? safeScripts[i] 
              : safeScripts[i].src;
            if (scriptSrc) {
              try {
                await loadScript(scriptSrc, i);
              } catch (error) {
                console.warn(`⚠️ Failed to load script ${i}:`, error);
              }
            }
          }
          
          // After scripts load, re-initialize dropdown functionality
          setTimeout(() => {
            initializeDropdowns();
          }, 500);
        };
        
        loadAllScripts();
      }
    }
    
    // Execute inline scripts (if any) - but skip to avoid errors
    // We skip inline scripts as they often reference missing modules
    // if (pageData.javascript?.inline && Array.isArray(pageData.javascript.inline)) {
    //   // Skipped to avoid errors
    // }
    
    // Initialize dropdowns after a short delay to ensure DOM is ready
    const initializeDropdowns = () => {
      try {
        console.log('🔧 Initializing dropdowns...');
        
        // Strategy 1: Find header/nav first, then find all links and items inside
        const header = document.querySelector('header, .cb-hm-mnu, .cb-nav, nav, [class*="header"], [class*="nav"], [id*="header"], [id*="nav"]') as HTMLElement;
        
        // Strategy 2: Find ALL nav links and menu items (more aggressive)
        const allNavLinks = document.querySelectorAll(`
          header a,
          nav a,
          .cb-nav a,
          .cb-hm-mnu a,
          [class*="nav"] a,
          [class*="menu"] a,
          [class*="header"] a,
          .cb-nav-lst a,
          .cb-hm-mnu-itm a,
          .cb-nav-subhdr,
          li a,
          .menu-item a,
          [role="navigation"] a,
          [class*="dropdown"] a,
          [data-dropdown],
          [aria-haspopup="true"]
        `.replace(/\s+/g, ',').replace(/,\s*$/, ''));
        
        console.log(`📋 Found ${allNavLinks.length} potential dropdown triggers`);
        
        allNavLinks.forEach((trigger: Element, index: number) => {
          try {
            const element = trigger as HTMLElement;
            
            if (!element || !element.addEventListener) return;
            
            // Skip if already initialized
            if (element.getAttribute('data-dropdown-initialized') === 'true') {
              return;
            }
            
            // Find menu in multiple ways - be more aggressive
            let menu: HTMLElement | null = null;
            
            // Check if element has a dropdown indicator (arrow, etc.)
            const hasDropdownIndicator = element.querySelector('i, svg, [class*="arrow"], [class*="down"], [class*="dropdown"]') ||
                                       element.textContent?.includes('▼') || 
                                       element.textContent?.includes('▼') ||
                                       element.getAttribute('aria-haspopup') === 'true';
            
            // Try all possible menu locations
            const menuSelectors = [
              '.dropdown-menu', '.cb-submenu', '[role="menu"]', '.sub-menu',
              '.cb-hm-mnu-itm-lst', '.cb-nav-subhdr-itms', '.cb-nav-subhdr-itm', 
              'ul.cb-nav-subhdr-itms', 'ul[class*="sub"]', 'ul[class*="menu"]',
              '[class*="submenu"]', '[class*="dropdown-menu"]', '[class*="menu-list"]',
              'nav ul', '.cb-nav ul', '.cb-hm-mnu ul', 'header ul',
              '.cb-nav-lst ul', '[class*="cb-nav"] ul'
            ];
            
            // Strategy 1: Find menu as next sibling
            if (!menu) {
              let next = element.nextElementSibling;
              while (next && !menu) {
                if (next.tagName === 'UL' || next.classList.toString().includes('sub') || 
                    next.classList.toString().includes('menu') || next.classList.toString().includes('dropdown')) {
                  menu = next as HTMLElement;
                  break;
                }
                next = next.nextElementSibling;
              }
            }
            
            // Strategy 2: Find menu in parent
            if (!menu) {
              const parent = element.parentElement;
              if (parent) {
                // Check parent's children for menu
                Array.from(parent.children).forEach((child) => {
                  if (child !== element && child.tagName === 'UL') {
                    menu = child as HTMLElement;
                  } else if (child !== element && (child.classList.toString().includes('sub') || 
                           child.classList.toString().includes('menu'))) {
                    menu = child as HTMLElement;
                  }
                });
                
                // Also check parent itself for menu items
                if (!menu) {
                  const parentUl = parent.querySelector('ul, .sub-menu, .dropdown-menu, [class*="submenu"]');
                  if (parentUl && parentUl !== element) {
                    menu = parentUl as HTMLElement;
                  }
                }
              }
            }
            
            // Strategy 3: Find menu in closest li parent
            if (!menu) {
              const liParent = element.closest('li');
              if (liParent) {
                // Find ul inside li
                menu = liParent.querySelector('ul, [class*="sub"], [class*="menu"]') as HTMLElement;
                
                // Or find ul as next sibling of li
                if (!menu) {
                  let next = liParent.nextElementSibling;
                  if (next && next.tagName === 'UL') {
                    menu = next as HTMLElement;
                  }
                }
              }
            }
            
            // Strategy 4: Use selectors to find menu
            if (!menu && hasDropdownIndicator) {
              for (const selector of menuSelectors) {
                // Try multiple search strategies
                menu = element.parentElement?.querySelector(selector) as HTMLElement ||
                       document.querySelector(`${selector}[data-parent="${element.getAttribute('data-id') || ''}"]`) as HTMLElement ||
                       element.closest('nav')?.querySelector(selector) as HTMLElement ||
                       element.closest('header')?.querySelector(selector) as HTMLElement ||
                       null;
                
                if (menu && menu instanceof HTMLElement && menu !== element) {
                  break;
                }
              }
            }
            
            // Mark as initialized even if no menu found (for debugging)
            element.setAttribute('data-dropdown-initialized', 'true');
            
            if (menu) {
              console.log(`✅ Found dropdown menu for element ${index}:`, element.className || element.tagName);
              
              // Ensure menu is hidden initially
              menu.style.display = 'none';
              menu.style.visibility = 'hidden';
              menu.style.opacity = '0';
              
              // Add click handler
              const clickHandler = (e: Event) => {
                try {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Toggle menu visibility
                  const computedStyle = window.getComputedStyle(menu!);
                  const isVisible = computedStyle.display !== 'none' && 
                                   computedStyle.visibility !== 'hidden' && 
                                   menu!.offsetParent !== null &&
                                   !menu!.classList.contains('hidden');
                  
                  // Close all dropdowns first
                  document.querySelectorAll('ul[style*="display: block"], ul[style*="display:block"], .dropdown-menu, .cb-submenu, .sub-menu, [role="menu"], .cb-hm-mnu-itm-lst, .cb-nav-subhdr-itms, [class*="submenu"]').forEach((otherMenu) => {
                    if (otherMenu instanceof HTMLElement && otherMenu !== menu) {
                      otherMenu.style.display = 'none';
                      otherMenu.style.visibility = 'hidden';
                      otherMenu.style.opacity = '0';
                      otherMenu.classList.remove('show', 'open', 'active');
                      otherMenu.classList.add('hidden');
                    }
                  });
                  
                  // Remove active class from all triggers
                  document.querySelectorAll('[data-dropdown-initialized="true"]').forEach((trigger) => {
                    if (trigger instanceof HTMLElement && trigger !== element) {
                      trigger.classList.remove('active', 'open');
                      trigger.setAttribute('aria-expanded', 'false');
                    }
                  });
                  
                  // Toggle current menu
                  if (isVisible) {
                    menu!.style.display = 'none';
                    menu!.style.visibility = 'hidden';
                    menu!.style.opacity = '0';
                    menu!.classList.remove('show', 'open', 'active');
                    menu!.classList.add('hidden');
                    element.classList.remove('active', 'open');
                  } else {
                    menu!.style.display = 'block';
                    menu!.style.visibility = 'visible';
                    menu!.style.opacity = '1';
                    menu!.style.position = 'absolute';
                    menu!.style.zIndex = '10000';
                    menu!.style.backgroundColor = menu!.style.backgroundColor || '#ffffff';
                    menu!.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    menu!.classList.add('show', 'open');
                    menu!.classList.remove('hidden');
                    element.classList.add('active', 'open');
                  }
                  
                  if (element.setAttribute) {
                    element.setAttribute('aria-expanded', (!isVisible).toString());
                  }
                  
                } catch (error) {
                  console.warn('⚠️ Error in dropdown click handler:', error);
                }
              };
              
              // Remove old listener if exists
              (element as any).__dropdownClickHandler = clickHandler;
              element.addEventListener('click', clickHandler);
              
              // Add hover handler (for desktop)
              const hoverHandler = () => {
                try {
                  if (menu && menu instanceof HTMLElement) {
                    // Close other dropdowns
                    document.querySelectorAll('ul[style*="display: block"], .dropdown-menu, .cb-submenu, .sub-menu, [role="menu"], .cb-hm-mnu-itm-lst, .cb-nav-subhdr-itms').forEach((otherMenu) => {
                      if (otherMenu instanceof HTMLElement && otherMenu !== menu) {
                        otherMenu.style.display = 'none';
                        otherMenu.style.visibility = 'hidden';
                        otherMenu.style.opacity = '0';
                        otherMenu.classList.remove('show', 'open');
                        otherMenu.classList.add('hidden');
                      }
                    });
                    
                    menu.style.display = 'block';
                    menu.style.visibility = 'visible';
                    menu.style.opacity = '1';
                    menu.style.position = 'absolute';
                    menu.style.zIndex = '10000';
                    menu.style.backgroundColor = menu.style.backgroundColor || '#ffffff';
                    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    menu.classList.add('show', 'open');
                    menu.classList.remove('hidden');
                    element.classList.add('active', 'open');
                    element.setAttribute('aria-expanded', 'true');
                  }
                } catch (error) {
                  console.warn('⚠️ Error in dropdown hover handler:', error);
                }
              };
              
              element.addEventListener('mouseenter', hoverHandler);
              
              // Keep menu open on hover
              if (menu) {
                menu.addEventListener('mouseenter', () => {
                  if (menu instanceof HTMLElement) {
                    menu.style.display = 'block';
                    menu.style.visibility = 'visible';
                  }
                });
                
                menu.addEventListener('mouseleave', () => {
                  // Optionally close on leave, or keep open
                  // menu.style.display = 'none';
                });
              }
              
            } else {
              // No menu found, but still log for debugging
              if (element.classList.contains('cb-hm-mnu-itm') || element.classList.contains('cb-nav-subhdr') || element.closest('nav')) {
                console.log(`⚠️ No menu found for ${element.className || element.tagName}`);
              }
            }
          } catch (error) {
            console.warn('⚠️ Error initializing dropdown trigger:', error);
          }
        });
        
        console.log('✅ Dropdown initialization complete');
      } catch (error) {
        console.warn('⚠️ Error in initializeDropdowns:', error);
      }
      
      // Close dropdowns when clicking outside (only add once)
      // Use a global variable instead of document attribute (document doesn't have hasAttribute)
      if (!(window as any).__dropdownOutsideListenerAdded) {
        (window as any).__dropdownOutsideListenerAdded = true;
        document.addEventListener('click', (e) => {
          try {
            const target = e.target as HTMLElement;
            if (!target || !target.closest) return;
            
            if (!target.closest('[data-dropdown], .dropdown-toggle, [aria-haspopup="true"], .nav-item, .cb-submenu-item, button[aria-expanded], .cb-hm-mnu-itm')) {
              document.querySelectorAll('.dropdown-menu, .cb-submenu, [role="menu"], .sub-menu, .cb-hm-mnu-itm-lst').forEach((menu) => {
                if (menu && menu instanceof HTMLElement) {
                  menu.style.display = 'none';
                  menu.style.visibility = 'hidden';
                  menu.style.opacity = '0';
                  menu.classList.remove('show');
                  menu.classList.add('hidden');
                }
              });
              
              document.querySelectorAll('[data-dropdown-initialized="true"]').forEach((trigger) => {
                if (trigger instanceof HTMLElement) {
                  trigger.classList.remove('active');
                  trigger.setAttribute('aria-expanded', 'false');
                }
              });
            }
          } catch (error) {
            console.warn('⚠️ Error in dropdown outside click handler:', error);
          }
        });
      }
    };
    
    // Initialize matches carousel (same as homepage)
    const initializeMatchesCarousel = () => {
      try {
        const matchesContainers = document.querySelectorAll(`
          [class*="match"],
          [class*="cricket-match"],
          [class*="live-score"],
          [id*="match"],
          [id*="live"],
          .cb-hm-scg-blk,
          .cb-mat-mnu-itm,
          .cb-scr-wll-chrt-itm
        `.replace(/\s+/g, ',').replace(/,\s*$/, ''));
        
        matchesContainers.forEach((container: Element) => {
          try {
            const containerEl = container as HTMLElement;
            if (!containerEl || containerEl.getAttribute('data-carousel-initialized') === 'true') return;
            
            const items = containerEl.querySelectorAll('[class*="match"], [class*="score"], .cb-mat-mnu-itm, .cb-scr-wll-chrt-itm, [data-match]');
            if (items.length <= 1) return;
            
            containerEl.setAttribute('data-carousel-initialized', 'true');
            containerEl.style.position = 'relative';
            containerEl.style.overflow = 'hidden';
            
            let innerWrapper = containerEl.querySelector('.matches-carousel-inner') as HTMLElement;
            if (!innerWrapper) {
              innerWrapper = document.createElement('div');
              innerWrapper.className = 'matches-carousel-inner';
              innerWrapper.style.display = 'flex';
              innerWrapper.style.transition = 'transform 0.5s ease-in-out';
              innerWrapper.style.width = '100%';
              
              Array.from(items).forEach((item: Element) => {
                (item as HTMLElement).style.minWidth = '100%';
                (item as HTMLElement).style.flexShrink = '0';
                innerWrapper.appendChild(item.cloneNode(true));
                item.remove();
              });
              
              containerEl.appendChild(innerWrapper);
            }
            
            let currentIndex = 0;
            const totalItems = innerWrapper.children.length;
            
            let prevBtn = containerEl.querySelector('.carousel-btn-prev') as HTMLElement;
            let nextBtn = containerEl.querySelector('.carousel-btn-next') as HTMLElement;
            
            if (!prevBtn) {
              prevBtn = document.createElement('button');
              prevBtn.className = 'carousel-btn-prev';
              prevBtn.innerHTML = '‹';
              prevBtn.style.cssText = `
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                z-index: 10;
                background: rgba(0,0,0,0.5);
                color: white;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
              `;
              containerEl.appendChild(prevBtn);
            }
            
            if (!nextBtn) {
              nextBtn = document.createElement('button');
              nextBtn.className = 'carousel-btn-next';
              nextBtn.innerHTML = '›';
              nextBtn.style.cssText = `
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                z-index: 10;
                background: rgba(0,0,0,0.5);
                color: white;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
              `;
              containerEl.appendChild(nextBtn);
            }
            
            const updateCarousel = () => {
              const translateX = -currentIndex * 100;
              innerWrapper.style.transform = `translateX(${translateX}%)`;
            };
            
            prevBtn.onclick = () => {
              currentIndex = (currentIndex - 1 + totalItems) % totalItems;
              updateCarousel();
            };
            
            nextBtn.onclick = () => {
              currentIndex = (currentIndex + 1) % totalItems;
              updateCarousel();
            };
            
            let autoSlideInterval = setInterval(() => {
              currentIndex = (currentIndex + 1) % totalItems;
              updateCarousel();
            }, 5000);
            
            containerEl.addEventListener('mouseenter', () => {
              clearInterval(autoSlideInterval);
            });
            
            containerEl.addEventListener('mouseleave', () => {
              autoSlideInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % totalItems;
                updateCarousel();
              }, 5000);
            });
            
            updateCarousel();
          } catch (error) {
            console.warn('⚠️ Error initializing carousel:', error);
          }
        });
      } catch (error) {
        console.warn('⚠️ Error in initializeMatchesCarousel:', error);
      }
    };
    
    // Replace logos and branding after HTML is rendered (ONLY actual logos, not content images/videos)
    // AGGRESSIVE - Runs continuously to catch dynamically loaded logos
    const replaceLogosAndBranding = () => {
      try {
        // Hide cbLogoSvg div and add our logo in its place
        const logoDivs = document.querySelectorAll('.cbLogoSvg, [class*="cbLogoSvg"], [class*="cb-logo"], [class*="cb_logo"]');
        logoDivs.forEach((div: Element) => {
          const divEl = div as HTMLElement;
          const parent = divEl.parentElement;
          
          // Hide the original div - FORCE hide with !important
          divEl.style.setProperty('display', 'none', 'important');
          divEl.style.setProperty('visibility', 'hidden', 'important');
          divEl.style.setProperty('opacity', '0', 'important');
          divEl.style.setProperty('width', '0', 'important');
          divEl.style.setProperty('height', '0', 'important');
          divEl.style.setProperty('position', 'absolute', 'important');
          divEl.style.setProperty('left', '-9999px', 'important');
          
          // Add our logo text in its place
          if (parent && !parent.querySelector('.cricinfobuzz-logo-replacement')) {
            const replacement = document.createElement('div');
            replacement.className = 'cricinfobuzz-logo-replacement';
            replacement.textContent = 'Cricinfobuzz';
            
            // Get parent's computed style to match colors
            const computedStyle = window.getComputedStyle(parent);
            const bgColor = computedStyle.backgroundColor;
            const isGreenBg = bgColor.includes('rgb(45, 80, 22)') || bgColor.includes('#2d5016') || bgColor.includes('rgb(26, 58, 10)');
            
            replacement.style.cssText = `
              font-weight: bold;
              font-size: 20px;
              color: ${isGreenBg ? '#ffffff' : '#2d5016'};
              display: inline-block;
              white-space: nowrap;
              line-height: 1;
              vertical-align: middle;
              cursor: pointer;
              z-index: 9999;
              position: relative;
            `;
            
            // Insert after the hidden div
            parent.insertBefore(replacement, divEl.nextSibling);
          }
        });
        
        // Also hide ALL logo images in header/top area (0-200px from top, left side)
        const allImages = document.querySelectorAll('img');
        allImages.forEach((img: Element) => {
          const imgEl = img as HTMLElement;
          const src = imgEl.getAttribute('src') || '';
          const alt = imgEl.getAttribute('alt') || '';
          const className = imgEl.className || '';
          const rect = imgEl.getBoundingClientRect();
          
          const isLogo = 
            src.includes('cb_logo') || src.includes('logo') ||
            alt.toLowerCase().includes('logo') || alt.toLowerCase().includes('cricbuzz') ||
            className.includes('logo') || className.includes('cb-logo');
          
          // Hide if it's a logo and in top-left area (header area)
          if (isLogo && rect.top < 200 && rect.left < 500) {
            imgEl.style.setProperty('display', 'none', 'important');
            imgEl.style.setProperty('visibility', 'hidden', 'important');
            imgEl.style.setProperty('opacity', '0', 'important');
            imgEl.style.setProperty('width', '0', 'important');
            imgEl.style.setProperty('height', '0', 'important');
            
            // Add our logo if not already added
            const parent = imgEl.parentElement;
            if (parent && !parent.querySelector('.cricinfobuzz-logo-replacement')) {
              const replacement = document.createElement('div');
              replacement.className = 'cricinfobuzz-logo-replacement';
              replacement.textContent = 'Cricinfobuzz';
              
              const computedStyle = window.getComputedStyle(parent);
              const bgColor = computedStyle.backgroundColor;
              const isGreenBg = bgColor.includes('rgb(45, 80, 22)') || bgColor.includes('#2d5016');
              
              replacement.style.cssText = `
                font-weight: bold;
                font-size: 20px;
                color: ${isGreenBg ? '#ffffff' : '#2d5016'};
                display: inline-block;
                white-space: nowrap;
                line-height: 1;
                vertical-align: middle;
                cursor: pointer;
                z-index: 9999;
                position: relative;
              `;
              
              parent.insertBefore(replacement, imgEl.nextSibling);
            }
          }
        });
        
        // STEP 1: Find header/nav elements first
        const header = document.querySelector('header, [class*="header"], [id*="header"], nav, [class*="nav"]') as HTMLElement;
        
        // STEP 2: Find additional logo images in header (additional check)
        const logoImages: HTMLElement[] = [];
        const headerRect = header?.getBoundingClientRect();
        const headerTop = headerRect ? headerRect.top : 0;
        const headerBottom = headerRect ? headerRect.bottom : 200; // First 200px if no header found
        
        // Check remaining images in header/top area (allImages already checked above)
        const remainingImages = Array.from(allImages).filter(img => {
          const rect = (img as HTMLElement).getBoundingClientRect();
          return rect.top >= headerTop && rect.top <= headerBottom;
        });
        
        remainingImages.forEach((img: Element) => {
          const imgEl = img as HTMLElement;
          if (imgEl) {
            const src = imgEl.getAttribute('src') || '';
            const alt = imgEl.getAttribute('alt') || '';
            const className = imgEl.className || '';
            const rect = imgEl.getBoundingClientRect();
            const isInHeaderArea = rect.top >= headerTop && rect.top <= headerBottom;
            const parent = imgEl.parentElement;
            const inHeader = header && (header.contains(imgEl) || parent?.closest('header') || parent?.closest('nav'));
            
            // Check if it's a logo - be very aggressive
            const isLogo = 
              // Check src for logo patterns
              src.includes('cb_logo') || 
              src.includes('/logo') || 
              src.includes('logo.svg') || 
              src.includes('logo.png') ||
              src.includes('logo.jpg') ||
              src.includes('logo.jpeg') ||
              // Check alt text for logo
              alt.toLowerCase().includes('logo') ||
              alt.toLowerCase().includes('cricbuzz') ||
              // Check classes for logo
              className.includes('cb-logo') || 
              className.includes('logo') ||
              // Check if in header and first image (likely logo)
              (isInHeaderArea && inHeader && rect.left < 300) || // Left side of header
              // Check parent classes
              parent?.classList.toString().includes('logo') ||
              parent?.classList.toString().includes('cb-logo') ||
              parent?.closest('[class*="logo"]');
            
            // If it's in header/top area and looks like a logo, add it
            if (isLogo && (isInHeaderArea || inHeader)) {
              logoImages.push(imgEl);
            }
          }
        });
        
        // Also check specifically in header/nav for any images (fallback)
        const headerImages = header ? header.querySelectorAll('img') : [];
        headerImages.forEach((img: Element) => {
          const imgEl = img as HTMLElement;
          if (imgEl && !logoImages.includes(imgEl)) {
            const rect = imgEl.getBoundingClientRect();
            // If image is in left side of header (where logo usually is)
            if (rect.left < 300 && rect.top < 100) {
              logoImages.push(imgEl);
            }
          }
        });
        
        // Hide actual logo images (double protection)
        logoImages.forEach((imgEl) => {
          imgEl.style.setProperty('display', 'none', 'important');
          imgEl.style.setProperty('visibility', 'hidden', 'important');
          imgEl.style.setProperty('opacity', '0', 'important');
          imgEl.style.setProperty('width', '0', 'important');
          imgEl.style.setProperty('height', '0', 'important');
        });
        
        // STEP 3: Find logo text elements (links, divs, spans) in header that contain "cricbuzz"
        // Be very aggressive - check ALL elements in header/nav area
        const headerElements = header ? header.querySelectorAll('*') : [];
        const logoTextElements: HTMLElement[] = [];
        // Reuse headerRect, headerTop, headerBottom from STEP 2
        
        // Check all elements in header/nav for "cricbuzz" text
        headerElements.forEach((el: Element) => {
          const elHtml = el as HTMLElement;
          if (elHtml && elHtml.textContent) {
            const text = elHtml.textContent.toLowerCase().trim();
            const rect = elHtml.getBoundingClientRect();
            const isInHeaderArea = rect.top >= headerTop && rect.top <= headerBottom;
            
            // Check if it contains "cricbuzz" (logo text) - be more aggressive
            if (text.includes('cricbuzz') && isInHeaderArea) {
              // Check if it's likely a logo (first occurrence, in header, or has logo classes)
              const isLikelyLogo = text === 'cricbuzz' || 
                                   text.includes('cricbuzz') && text.length < 30 ||
                                   elHtml.classList.toString().includes('logo') ||
                                   elHtml.closest('[class*="logo"]') ||
                                   elHtml.closest('[id*="logo"]');
              
              if (isLikelyLogo) {
                logoTextElements.push(elHtml);
              }
            }
          }
        });
        
        // Also check first 200px of page for logo text (in case header detection fails)
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el: Element) => {
          const elHtml = el as HTMLElement;
          if (elHtml && elHtml.textContent) {
            const rect = elHtml.getBoundingClientRect();
            const isInTopArea = rect.top >= 0 && rect.top <= 200; // First 200px
            
            if (isInTopArea && !header?.contains(elHtml)) {
              const text = elHtml.textContent.toLowerCase().trim();
              // Check if it's "cricbuzz" (exact match for logo)
              if (text === 'cricbuzz' || (text.includes('cricbuzz') && text.length < 15)) {
                const isLogo = elHtml.classList.toString().includes('logo') ||
                               elHtml.closest('[class*="logo"]') ||
                               elHtml.parentElement?.classList.toString().includes('header') ||
                               elHtml.parentElement?.classList.toString().includes('nav');
                
                if (isLogo && !logoTextElements.includes(elHtml)) {
                  logoTextElements.push(elHtml);
                }
              }
            }
          }
        });
        
        // Replace logo text with "Cricinfobuzz"
        logoTextElements.forEach((el) => {
          if (el.textContent) {
            el.textContent = el.textContent.replace(/Cricbuzz/gi, 'Cricinfobuzz');
            // Set white color if parent has green background (logo styling)
            const parent = el.parentElement;
            const computedStyle = parent ? window.getComputedStyle(parent) : null;
            if (computedStyle && computedStyle.backgroundColor.includes('rgb(45, 80, 22)')) {
              el.style.color = '#ffffff'; // White text on green background
            }
          }
        });
        
        // STEP 4: Find all text nodes containing "Cricbuzz" and replace (including logo text)
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        const textNodes: Text[] = [];
        let node;
        while (node = walker.nextNode()) {
          if (node.textContent?.includes('Cricbuzz')) {
            textNodes.push(node as Text);
          }
        }
        
        textNodes.forEach((textNode) => {
          if (textNode.textContent) {
            // Don't replace if it's part of a URL
            const parent = textNode.parentElement;
            if (parent) {
              const isInUrl = parent.tagName === 'A' && parent.getAttribute('href')?.includes('cricbuzz');
              if (!isInUrl) {
                textNode.textContent = textNode.textContent.replace(/Cricbuzz/gi, 'Cricinfobuzz');
              }
            } else {
              textNode.textContent = textNode.textContent.replace(/Cricbuzz/gi, 'Cricinfobuzz');
            }
          }
        });
        
        // STEP 5: Add Cricinfobuzz text where logo images were hidden
        logoImages.forEach((imgEl) => {
          if (imgEl && imgEl.parentElement) {
            if (!imgEl.parentElement.querySelector('.cricinfobuzz-logo-replacement')) {
              const replacement = document.createElement('span');
              replacement.className = 'cricinfobuzz-logo-replacement';
              replacement.textContent = 'Cricinfobuzz';
              // Get parent's computed style to match colors
              const parent = imgEl.parentElement;
              const computedStyle = parent ? window.getComputedStyle(parent) : null;
              const bgColor = computedStyle?.backgroundColor || '';
              const isGreenBg = bgColor.includes('rgb(45, 80, 22)') || bgColor.includes('#2d5016');
              
              replacement.style.cssText = `
                font-weight: bold;
                font-size: 20px;
                color: ${isGreenBg ? '#ffffff' : '#2d5016'};
                display: inline-block;
                white-space: nowrap;
                line-height: 1;
                vertical-align: middle;
              `;
              imgEl.parentElement.insertBefore(replacement, imgEl);
            }
          }
        });
        
        console.log(`✅ Logo replacement: ${textNodes.length} text nodes, ${logoImages.length} logo images, ${logoTextElements.length} logo text elements`);
      } catch (error) {
        console.warn('⚠️ Error replacing logos:', error);
      }
    };
    
    // Set up MutationObserver to continuously monitor and hide logos
    if (!(window as any).__logoMutationObserver) {
      (window as any).__logoMutationObserver = new MutationObserver(() => {
        // Run logo replacement on every DOM change
        replaceLogosAndBranding();
      });
      
      // Start observing - watch for any DOM changes
      (window as any).__logoMutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      
      console.log('✅ Logo MutationObserver started - continuously monitoring');
    }
    
    // Initialize immediately and also retry after delays (DOM might load slowly)
    initializeDropdowns();
    initializeMatchesCarousel();
    replaceLogosAndBranding();
    
    // Retry after DOM is fully loaded
    setTimeout(() => {
      initializeDropdowns();
      initializeMatchesCarousel();
      replaceLogosAndBranding();
    }, 1000);
    
    // Final retry after longer delay
    setTimeout(() => {
      initializeDropdowns();
      initializeMatchesCarousel();
      replaceLogosAndBranding();
    }, 3000);
    
    // Run logo replacement every 2 seconds as backup (in case MutationObserver misses something)
    const logoInterval = setInterval(() => {
      replaceLogosAndBranding();
    }, 2000);
    
    // Cleanup interval on unmount
    return () => {
      if ((window as any).__logoMutationObserver) {
        (window as any).__logoMutationObserver.disconnect();
        delete (window as any).__logoMutationObserver;
      }
      clearInterval(logoInterval);
    };
  }, [pageData, pathname]);
  

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e40af] via-[#1e3a8a] to-[#1e40af]">
        <div className="text-center">
          {/* Animated Logo/Text */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-white mb-2 animate-pulse">
              Cricinfobuzz
            </h1>
            <div className="h-1 w-32 bg-white/30 mx-auto rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full loading-bar-animate"></div>
            </div>
          </div>
          
          {/* Spinner */}
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-white/20 rounded-full mx-auto"></div>
            <div className="w-20 h-20 border-4 border-transparent border-t-white rounded-full mx-auto animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          
          {/* Loading Text */}
          <div className="space-y-2">
            <p className="text-white text-lg font-semibold animate-pulse">
              Loading Page...
            </p>
            <p className="text-white/70 text-sm">
              Fetching {pathname === '/' ? 'homepage' : pathname}
            </p>
            <div className="flex justify-center gap-1 mt-4">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-700 mb-4">❌ Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-[#2d5016] text-white px-4 py-2 rounded hover:bg-[#1f350f]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <p className="text-red-600">Failed to load page</p>
      </div>
    );
  }

  // Function to sanitize HTML - aggressively remove all script tags and problematic attributes
  // Also replaces branding/logos with Cricinfobuzz
  const sanitizeHTML = (html: string): string => {
    if (!html) return '';
    
    let sanitized = html;
    
    // STEP 0: Rewrite Cricbuzz domain links to local slug-only paths
    const rewriteSourceLinks = (input: string): string => {
      return input.replace(/href=(["'])(?:https?:)?\/\/(?:www\.|m\.)?cricbuzz\.com([^"']*)\1/gi, (_match, quote, path) => {
        const normalizedPath = path && path.trim().length > 0 ? path : '/';
        const cleanedPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
        return `href=${quote}${cleanedPath}${quote}`;
      });
    };
    
    sanitized = rewriteSourceLinks(sanitized);
    
    // STEP 1: Remove ALL script tags completely (we handle interactivity ourselves)
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // STEP 2: Remove noscript tags that might contain problematic content
    sanitized = sanitized.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    
    // STEP 3: Remove data attributes that reference webpack, next, or internal modules
    sanitized = sanitized.replace(/\s+data-[^=]*=["'][^"']*(?:webpack|__webpack|next|node_modules|\/src\/|\/components\/|\.\/src\/|\.\/components\/|chunk|\.ts|\.jsx?)[^"']*["']/gi, '');
    
    // STEP 4: Remove any href attributes that point to webpack/next internals
    sanitized = sanitized.replace(/\s+href=["'][^"']*(?:webpack|__webpack|next\/static|node_modules|\/src\/|\/components\/)[^"']*["']/gi, '');
    
    // STEP 5: Remove any src attributes that point to webpack/next internals (for images, etc.)
    sanitized = sanitized.replace(/\s+src=["'][^"']*(?:webpack|__webpack|next\/static|node_modules|\/src\/|\/components\/|\.ts|\.jsx?)[^"']*["']/gi, '');
    
    // STEP 6: Remove any on* event handlers that might execute problematic code
    sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s+on\w+\s*=\s*{[^}]*}/gi, '');
    
    // STEP 7: Remove any inline styles that might contain javascript: URLs
    sanitized = sanitized.replace(/style=["'][^"']*javascript:[^"']*["']/gi, 'style=""');
    
    // STEP 8: Replace branding/logos - Replace "Cricbuzz" text with "Cricinfobuzz" (only text, not URLs)
    sanitized = sanitized.replace(/>([^<]*?)Cricbuzz([^<]*?)</gi, '>$1Cricinfobuzz$2<');
    // Replace Cricbuzz text in content, but preserve URLs
    sanitized = sanitized.replace(/Cricbuzz/gi, (match, offset, string) => {
      // Check if it's part of a URL (http://, https://, www., etc.)
      const before = string.substring(Math.max(0, offset - 20), offset);
      const after = string.substring(offset + match.length, offset + match.length + 10);
      if (before.match(/(https?:\/\/|www\.|href|src|url)/i) || after.match(/(\.com|\.org|\.net|\/)/)) {
        return match; // Keep original if it's in a URL
      }
      return 'Cricinfobuzz';
    });
    
    // STEP 9: Replace ONLY specific logo images (cb_logo.svg, cb-logo class) - NOT all images
    sanitized = sanitized.replace(/(<img[^>]*(?:cb[_-]logo|cb_logo\.svg|cb-logo)[^>]*>)/gi, (match) => {
      // Hide only specific logo images
      const hasStyle = match.includes('style=');
      if (hasStyle) {
        return match.replace(/style=["'][^"']*["']/gi, 'style="display: none !important;"');
      } else {
        return match.replace(/>/, ' style="display: none !important;">');
      }
    });
    
    // STEP 10: Replace logo text in links (only in header/nav logo links)
    sanitized = sanitized.replace(/(<a[^>]*(?:cb[_-]?logo|class[^"]*logo)[^>]*>)([^<]*?)<\/a>/gi, (match, openTag, content) => {
      // Only replace if it's in header/nav context
      const before = match.substring(0, Math.max(0, match.lastIndexOf(openTag) - 200));
      if (before.includes('<header') || before.includes('<nav') || before.includes('cb-logo')) {
        return openTag + 'Cricinfobuzz</a>';
      }
      return match; // Keep original if not in header/nav
    });
    
    // STEP 11: Clean up any double spaces or empty attributes that might cause issues
    sanitized = sanitized.replace(/\s{2,}/g, ' ');
    sanitized = sanitized.replace(/\s*=\s*["']\s*["']/g, '');
    
    return sanitized;
  };

  // Render exact HTML (but sanitized)
  if (pageData?.rawHtml) {
    const cleanedHTML = sanitizeHTML(pageData.rawHtml);
    
    return (
      <ErrorBoundary>
        <div className="cricinfobuzz-clone w-full m-0 p-0" style={{ width: '100%', margin: 0, padding: 0 }} suppressHydrationWarning>
          <div 
            dangerouslySetInnerHTML={{ __html: cleanedHTML }} 
            className="w-full m-0 p-0"
            style={{ width: '100%', margin: 0, padding: 0 }}
            suppressHydrationWarning
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <p className="text-gray-600">Page loaded but no HTML content available</p>
    </div>
  );
}

