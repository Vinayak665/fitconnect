const supabase = require('c:\\Users\\vinay\\OneDrive\\Desktop\\1\\database.js');

async function checkSchema() {
    console.log('Checking "trainers" table schema...');
    try {
        const { data, error } = await supabase
            .from('trainers')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('Error fetching from trainers:', error);
            return;
        }
        
        if (data && data.length > 0) {
            console.log('Columns found:', Object.keys(data[0]));
        } else {
            console.log('Table is empty, cannot determine columns from select *');
            // Try another way
            const { data: cols, error: err2 } = await supabase.rpc('get_table_columns', { table_name: 'trainers' });
            if (err2) console.log('RPC get_table_columns failed (expected if not defined)');
            else console.log('Columns from RPC:', cols);
        }
    } catch (err) {
        console.error('Catch error:', err.message);
    }
}

checkSchema();
