#!/bin/bash

# Replace all price-related dollar signs with BDT symbol (৳) in TypeScript/TSX files

# Pattern 1: ${product.price} or ${product.currentBid} etc.
find src -name "*.tsx" -o -name "*.ts" | while read file; do
    # Replace price displays
    sed -i 's/\${\([^}]*\)price\([^}]*\)}/৳{\1price\2}/g' "$file"
    sed -i 's/\${\([^}]*\)amount\([^}]*\)}/৳{\1amount\2}/g' "$file"  
    sed -i 's/\${\([^}]*\)bid\([^}]*\)}/৳{\1bid\2}/g' "$file"
    sed -i 's/\${\([^}]*\)\.revenue\([^}]*\)}/৳{\1.revenue\2}/g' "$file"
    
    # Replace literal currency strings
    sed -i "s/value: \`\\\$\${/value: \`৳\${/g" "$file"
done

echo "Currency symbols updated to BDT (৳)"
