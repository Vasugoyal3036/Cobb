with open('src/components/tabs/DashboardTab.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

insertion = """                  </div>
                </div>
              </div>
            )}
            {/* 3. MONTHLY PRODUCTS */}
            {activeTab === 'monthly' && (() => {
              const groupedByMonth = (monthlyProducts || []).reduce((acc, row) => {
                  if (!acc[row.SaleMonth]) acc[row.SaleMonth] = [];
                  acc[row.SaleMonth].push(row);
                  return acc;
              }, {});
              return (
              <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 mb-6 gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                      <Calendar className="w-6 h-6 mr-3 text-blue-600" /> Monthly Sales by Category
                    </h3>
"""

lines.insert(1703, insertion)

with open('src/components/tabs/DashboardTab.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
