// Dùng: node --env-file=.env scripts/create-admin.js <username> <password> [họ tên]
// Tạo role "admin" nếu chưa có, tạo user và gán role.
const { pool, withTransaction, isDuplicateKeyError } = require('../src/db/pool');
const usersRepo = require('../src/repositories/users.repo');
const rolesRepo = require('../src/repositories/roles.repo');
const { hashPassword } = require('../src/utils/password');

async function main() {
  const [username, password, fullName] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Dùng: create-admin.js <username> <password> [họ tên]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ERROR: mật khẩu tối thiểu 8 ký tự');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const userId = await withTransaction(async (conn) => {
    const roleId = await rolesRepo.findIdByName('admin', conn)
      || await rolesRepo.insert({ name: 'admin', description: 'Quản trị hệ thống' }, conn);
    const id = await usersRepo.insert({ username, passwordHash, fullName: fullName || null }, conn);
    await usersRepo.addRole(id, roleId, conn);
    return id;
  });
  console.log(`Đã tạo admin "${username}" (id ${userId}).`);
}

main()
  .catch((err) => {
    console.error('ERROR', isDuplicateKeyError(err) ? 'tên đăng nhập đã tồn tại' : err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
